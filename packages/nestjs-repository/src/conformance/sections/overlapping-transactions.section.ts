import { OptimisticLockException } from '../../exceptions/optimistic-lock.exception.js';
import { RepositoryDatabaseException } from '../../exceptions/repository-database.exception.js';
import { Where } from '../../repository/where.helpers.js';
import { type TransactionContextInterface } from '../../transaction/interfaces/transaction-context.interface.js';
import { assert, assertRows, settle } from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';

/** Rounds of each race, so an interleaving that fails shows up. */
const ROUNDS = 10;

/** Callers in each race. */
const CALLERS = 4;

/**
 * A meeting point for `count` callers: each waits until all have arrived.
 */
function barrier(count: number): () => Promise<void> {
  let arrived = 0;
  let open = (): void => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return () => {
    arrived += 1;
    if (arrived === count) open();
    return opened;
  };
}

/**
 * Transactions that overlap, each on its own connection: one commits while
 * another is open. Every caller runs in its own run. Where a store's own
 * limits can make a write fail (a deadlock, a conflict between concurrent
 * inserts), the case accepts the failure, as long as a run that resolves
 * kept all of its writes and one that rejects kept none.
 */
export function overlappingTransactions(ctx: ConformanceContext): void {
  const { it } = ctx.test;

  const run = <T>(
    operation: (txCtx: TransactionContextInterface) => Promise<T>,
  ): Promise<T> => ctx.transactionScope.run({}, operation);

  const item = () => ctx.repo('item');
  const plain = () => ctx.repo('plainItem');
  const unique = () => ctx.repo('uniqueItem');
  const readItem = (id: string | number) =>
    item().findOne({ where: Where.eq('id', id), withDeleted: true });

  // A write the store's own limits refuse fails with the store's error.
  const failedCleanly = (outcome: { ok: boolean; error?: unknown }) => {
    if (!outcome.ok) {
      assert.ok(
        outcome.error instanceof RepositoryDatabaseException,
        String(outcome.error),
      );
    }
  };

  it('overlapping transactions: a versioned write of a row another run has changed since it read it is refused', async () => {
    const stored = await item().create({ name: 'o', rank: 1, note: null });

    // Guarded by the row's own version, then by the version the run read,
    // stated as `expectedVersion`.
    for (const stated of [false, true]) {
      const before = await readItem(stored.id);
      assert.ok(before);
      await assert.rejects(
        run(async (txCtx) => {
          const [mine] = await item().find({
            where: Where.eq('id', stored.id),
            ctx: txCtx,
          });
          assert.ok(mine);
          await run((theirs) =>
            item().update(
              before,
              { rank: before.version + 10 },
              { ctx: theirs },
            ),
          );
          return item().update(
            mine,
            { note: 'mine' },
            {
              ctx: txCtx,
              expectedVersion: stated ? mine.version : undefined,
            },
          );
        }),
        OptimisticLockException,
      );
    }

    const after = await readItem(stored.id);
    assert.equal(after?.note, null);
    assert.equal(after?.version, stored.version + 2);
  });

  it('overlapping transactions: a write in a run that has read returns the row as stored, not as the run read it', async () => {
    const stored = await plain().create({ name: 'first' });

    const written = await run(async (txCtx) => {
      await plain().find({ ctx: txCtx });
      await run((theirs) =>
        plain().update(stored, { name: 'theirs' }, { ctx: theirs }),
      );
      return plain().update(stored, { name: 'theirs' }, { ctx: txCtx });
    });

    assertRows(written, { id: stored.id, name: 'theirs' });
  });

  it('overlapping transactions: an upsert in a run that has read returns the row as stored, not as the run read it', async () => {
    const stored = await plain().create({ name: 'first' });

    const written = await run(async (txCtx) => {
      await plain().find({ ctx: txCtx });
      await run((theirs) =>
        plain().update(stored, { name: 'theirs' }, { ctx: theirs }),
      );
      return plain().upsert({ id: stored.id, name: 'theirs' }, { ctx: txCtx });
    });

    assertRows(written, { id: stored.id, name: 'theirs' });
  });

  // A version that moves on although the write changed nothing is accepted:
  // an ORM may compare against the row as the run first read it.
  it('overlapping transactions: a versioned write of values another run stored since this run read returns the row as stored', async () => {
    const stored = await item().create({ name: 'o', rank: 1, note: null });

    const written = await run(async (txCtx) => {
      await item().find({ ctx: txCtx });
      await run((theirs) =>
        item().update(stored, { rank: 7 }, { ctx: theirs }),
      );
      const current = await readItem(stored.id);
      assert.ok(current);
      return item().update(current, { rank: 7 }, { ctx: txCtx });
    });

    const after = await readItem(stored.id);
    assert.ok(after && after.version > stored.version);
    assertRows(written, after);
    assertRows(after, { ...stored, rank: 7, version: after.version });
  });

  it('overlapping transactions: a run that catches a deadlock keeps all of its writes or none', async () => {
    const [a, b] = await plain().createMany([{ name: 'a' }, { name: 'b' }]);
    assert.ok(a && b);
    const bothLocked = barrier(2);
    const victims: string[] = [];

    // Each run writes a trace row and its own row, then the other's: the
    // store fails one of them. That run carries on and writes a marker row.
    // The crossing write is an upsert, so only the driver's report of the
    // ended transaction can fail the run.
    const crossing = (own: typeof a, other: typeof a, name: string) =>
      settle(
        run(async (txCtx) => {
          await plain().create({ name: `${name}-trace` }, { ctx: txCtx });
          await plain().update(own, { name: `${name}-own` }, { ctx: txCtx });
          await bothLocked();
          try {
            await plain().upsert(
              { id: other.id, name: `${name}-other` },
              { ctx: txCtx },
            );
          } catch {
            victims.push(name);
            await plain()
              .create({ name: `${name}-marker` }, { ctx: txCtx })
              .catch(() => undefined);
          }
        }),
      );

    const [first, second] = await Promise.all([
      crossing(a, b, 'first'),
      crossing(b, a, 'second'),
    ]);

    assert.equal(victims.length, 1, 'the store fails one of the two runs');
    const [victim] = victims;
    const victimRun = victim === 'first' ? first : second;
    const otherRun = victim === 'first' ? second : first;
    const names = (await plain().find()).map(({ name }) => name);
    // The run the store failed kept its writes, trace and marker alike,
    // exactly when it committed.
    assert.deepStrictEqual(
      [names.includes(`${victim}-trace`), names.includes(`${victim}-marker`)],
      [victimRun.ok, victimRun.ok],
    );
    assert.ok(otherRun.ok, 'the other run commits');
  });

  it('overlapping transactions: runs that upsert the same new key at once leave one row', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const id = `fresh-${round}`;
      const outcomes = await Promise.all(
        Array.from({ length: CALLERS }, (_, caller) =>
          settle(
            run((txCtx) =>
              unique().upsert(
                { id, code: id, name: `caller-${caller}` },
                { ctx: txCtx },
              ),
            ),
          ),
        ),
      );

      outcomes.forEach(failedCleanly);
      const rows = await unique().find({ where: Where.eq('code', id) });
      assert.equal(rows.length, 1, id);
      assert.equal(rows[0]?.id, id);
    }
    assert.equal(await unique().count(), ROUNDS);
  });

  it('overlapping transactions: runs that upsert the same stored key at once move the version once per write kept', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const id = `stored-${round}`;
      const stored = await unique().create({ id, code: id, name: 'stored' });

      const outcomes = await Promise.all(
        Array.from({ length: CALLERS }, (_, caller) =>
          settle(
            run((txCtx) =>
              unique().upsert({ id, name: `caller-${caller}` }, { ctx: txCtx }),
            ),
          ),
        ),
      );

      outcomes.forEach(failedCleanly);
      const kept = outcomes.flatMap((outcome) =>
        outcome.ok ? [outcome.value] : [],
      );
      const after = await unique().findOne({ where: Where.eq('id', id) });
      assert.equal(after?.version, stored.version + kept.length, id);
      // Each write kept moved the version on once, the last to the stored one.
      assert.deepStrictEqual(
        kept.map(({ version }) => version).sort((a, b) => a - b),
        kept.map((_, index) => stored.version + index + 1),
        id,
      );
      assert.ok(
        kept.length === 0
          ? after?.name === 'stored'
          : kept.some(({ name }) => name === after?.name),
        id,
      );
    }
  });

  it('overlapping transactions: runs that read the same versioned row, then each write it, keep exactly one write', async () => {
    const stored = await item().create({ name: 'o', rank: 1, note: null });
    const allRead = barrier(CALLERS);

    const outcomes = await Promise.all(
      Array.from({ length: CALLERS }, (_, caller) =>
        settle(
          run(async (txCtx) => {
            const [mine] = await item().find({
              where: Where.eq('id', stored.id),
              ctx: txCtx,
            });
            assert.ok(mine);
            await allRead();
            return item().update(mine, { rank: caller + 10 }, { ctx: txCtx });
          }),
        ),
      ),
    );

    const kept = outcomes.flatMap((outcome) =>
      outcome.ok ? [outcome.value] : [],
    );
    assert.equal(kept.length, 1);
    for (const outcome of outcomes) {
      if (!outcome.ok) {
        assert.ok(
          outcome.error instanceof OptimisticLockException,
          String(outcome.error),
        );
      }
    }
    const after = await readItem(stored.id);
    assert.equal(after?.version, stored.version + 1);
    assert.equal(after?.rank, kept[0]?.rank);
  });
}
