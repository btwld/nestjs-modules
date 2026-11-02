import { OptimisticLockException } from '../../exceptions/optimistic-lock.exception.js';
import { OrderBy } from '../../repository/order-by.helpers.js';
import { Where } from '../../repository/where.helpers.js';
import { type TransactionContextInterface } from '../../transaction/interfaces/transaction-context.interface.js';
import { assert, assertRows } from '../conformance-assert.js';
import { type ConformanceContext } from '../conformance-context.js';
import { type ConformanceItemInterface } from '../interfaces/conformance-item.interface.js';

class ConformanceRollback extends Error {
  constructor() {
    super('conformance rollback');
  }
}

/**
 * How a driver takes part in the caller's transaction, and, inside one, how
 * it guards versioned writes. A driver that refuses transactions runs
 * without one: writes made before a throw stay.
 */
export function transactionsSection(ctx: ConformanceContext): void {
  if (ctx.capabilities.transactions === 'supported') {
    supported(ctx);
  } else {
    refused(ctx);
  }
}

function run<T>(
  ctx: ConformanceContext,
  operation: (txCtx: TransactionContextInterface) => Promise<T>,
): Promise<T> {
  return ctx.transactionScope.run({}, operation);
}

function names(ctx: ConformanceContext): Promise<string[]> {
  return ctx
    .repo('plainItem')
    .find()
    .then((rows) => rows.map(({ name }) => name).sort());
}

function supported(ctx: ConformanceContext): void {
  const { it } = ctx.test;
  const softDelete = ctx.capabilities.softDelete === 'supported';

  it('transactions: a run has a transaction', async () => {
    await run(ctx, async (txCtx) => {
      assert.equal(txCtx.trx.isSupported, true);
    });
  });

  it('transactions: a run that throws leaves none of its writes', async () => {
    await assert.rejects(
      run(ctx, async (txCtx) => {
        await ctx.repo('plainItem').create({ name: 'doomed' }, { ctx: txCtx });
        throw new ConformanceRollback();
      }),
      ConformanceRollback,
    );

    assert.deepStrictEqual(await names(ctx), []);
  });

  it('transactions: a run that completes keeps its writes', async () => {
    await run(ctx, (txCtx) =>
      ctx.repo('plainItem').create({ name: 'kept' }, { ctx: txCtx }),
    );

    assert.deepStrictEqual(await names(ctx), ['kept']);
  });

  it('transactions: every read in a run sees the run’s own writes', async () => {
    const seen = await run(ctx, async (txCtx) => {
      const plain = ctx.repo('plainItem');
      await plain.create({ name: 'mine' }, { ctx: txCtx });
      return {
        found: await plain.find({ ctx: txCtx }),
        one: await plain.findOne({
          where: Where.eq('name', 'mine'),
          ctx: txCtx,
        }),
        count: await plain.count({ ctx: txCtx }),
        total: (await plain.findAndCount({ ctx: txCtx }))[1],
      };
    });

    assert.deepStrictEqual(
      seen.found.map(({ name }) => name),
      ['mine'],
    );
    assert.equal(seen.one?.name, 'mine');
    assert.equal(seen.count, 1);
    assert.equal(seen.total, 1);
  });

  it('transactions: every write in a run that throws is undone', async () => {
    const item = ctx.repo('item');
    const [a, b, c, d, e, f, g, h] = await item.createMany(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((name) => ({
        name,
        rank: 1,
        note: null,
      })),
    );
    assert.ok(a && b && c && d && e && f && g && h);
    const removedE = softDelete ? await item.softDelete(e) : e;
    const snapshot = () =>
      item.find({ withDeleted: true, order: [OrderBy.asc('name')] });
    const before = await snapshot();

    await assert.rejects(
      run(ctx, async (txCtx) => {
        const options = { ctx: txCtx };
        await item.createMany([{ name: 'new', rank: 1, note: null }], options);
        await item.update(a, { rank: 2 }, options);
        await item.replace(b, { rank: 2 }, options);
        await item.upsert({ id: c.id, name: 'c', rank: 2 }, options);
        await item.upsert({ name: 'upserted', rank: 1, note: null }, options);
        await item.delete(d, options);
        if (softDelete) {
          await item.restore(removedE, options);
          await item.softDelete(f, options);
        }
        await item.deleteMany([g, h], options);
        throw new ConformanceRollback();
      }),
      ConformanceRollback,
    );

    assertRows(await snapshot(), before);
  });

  it('doCreateMany: a duplicate key in a run fails the run and keeps no row', async () => {
    await assert.rejects(
      run(ctx, (txCtx) =>
        ctx.repo('author').createMany(
          [
            { id: 'author-same', name: 'first' },
            { id: 'author-same', name: 'second' },
          ],
          { ctx: txCtx },
        ),
      ),
    );

    assert.equal(await ctx.repo('author').count(), 0);
  });

  versionGuard(ctx);
}

/**
 * Write once through the repository, then write again with the row as it
 * was before: the stored version has moved on, so the second write must be
 * refused by the driver, not just by the version the caller states. Each
 * write runs in its own transaction, since a refused one fails its run.
 */
function versionGuard(ctx: ConformanceContext): void {
  const { it } = ctx.test;

  const item = () => ctx.repo('item');

  const create = () =>
    run(ctx, (txCtx) =>
      item().create({ name: 'versioned', rank: 1, note: null }, { ctx: txCtx }),
    );

  const stored = () =>
    item().findOne({ where: Where.eq('name', 'versioned'), withDeleted: true });

  const changed = (
    before: ConformanceItemInterface,
    after: ConformanceItemInterface,
  ) => assert.notEqual(after.version, before.version);

  it('doUpdate: changes the version, and refuses a stale row', async () => {
    const stale = await create();
    const updated = await run(ctx, (txCtx) =>
      item().update(stale, { rank: 2 }, { ctx: txCtx }),
    );

    changed(stale, updated);
    await assert.rejects(
      run(ctx, (txCtx) => item().update(stale, { rank: 3 }, { ctx: txCtx })),
      OptimisticLockException,
    );
    assert.equal((await stored())?.rank, 2);
  });

  it('doReplace: changes the version, and refuses a stale row', async () => {
    const stale = await create();
    const replaced = await run(ctx, (txCtx) =>
      item().replace(stale, { rank: 2 }, { ctx: txCtx }),
    );

    changed(stale, replaced);
    await assert.rejects(
      run(ctx, (txCtx) => item().replace(stale, { rank: 3 }, { ctx: txCtx })),
      OptimisticLockException,
    );
    assert.equal((await stored())?.rank, 2);
  });

  it('doUpdate and doReplace: a versioned row deleted since it was read is a conflict', async () => {
    const stale = await create();
    await run(ctx, (txCtx) => item().delete(stale, { ctx: txCtx }));

    await assert.rejects(
      run(ctx, (txCtx) => item().update(stale, { rank: 2 }, { ctx: txCtx })),
      OptimisticLockException,
    );
    await assert.rejects(
      run(ctx, (txCtx) => item().replace(stale, { rank: 2 }, { ctx: txCtx })),
      OptimisticLockException,
    );
    assert.equal(await stored(), null);
  });

  it('doUpsert: changes the version of a stored row', async () => {
    const created = await create();
    const upserted = await run(ctx, (txCtx) =>
      item().upsert(
        { id: created.id, name: 'versioned', rank: 2 },
        { ctx: txCtx },
      ),
    );

    changed(created, upserted);
  });

  it('doDelete: refuses a stale row', async () => {
    const stale = await create();
    await run(ctx, (txCtx) =>
      item().update(stale, { rank: 2 }, { ctx: txCtx }),
    );

    await assert.rejects(
      run(ctx, (txCtx) =>
        item().delete(stale, {
          ctx: txCtx,
          expectedVersion: stale.version,
        }),
      ),
      OptimisticLockException,
    );
    assert.equal((await stored())?.rank, 2);
  });

  if (ctx.capabilities.softDelete === 'supported') {
    it('doSoftDelete: changes the version, and refuses a stale row', async () => {
      const stale = await create();
      const updated = await run(ctx, (txCtx) =>
        item().update(stale, { rank: 2 }, { ctx: txCtx }),
      );

      await assert.rejects(
        run(ctx, (txCtx) =>
          item().softDelete(stale, {
            ctx: txCtx,
            expectedVersion: stale.version,
          }),
        ),
        OptimisticLockException,
      );
      assert.equal((await stored())?.removedAt, null);

      const removed = await run(ctx, (txCtx) =>
        item().softDelete(updated, { ctx: txCtx }),
      );
      changed(updated, removed);
    });

    it('doRestore: changes the version, and refuses a stale row', async () => {
      const created = await create();
      const stale = await run(ctx, (txCtx) =>
        item().softDelete(created, { ctx: txCtx }),
      );
      const restored = await run(ctx, (txCtx) =>
        item().restore(stale, { ctx: txCtx }),
      );
      changed(stale, restored);

      await run(ctx, (txCtx) => item().softDelete(restored, { ctx: txCtx }));

      await assert.rejects(
        run(ctx, (txCtx) =>
          item().restore(stale, {
            ctx: txCtx,
            expectedVersion: stale.version,
          }),
        ),
        OptimisticLockException,
      );
      assert.ok((await stored())?.removedAt instanceof Date);
    });
  }
}

function refused(ctx: ConformanceContext): void {
  const { it } = ctx.test;

  it('transactions: a run has no transaction', async () => {
    await run(ctx, async (txCtx) => {
      assert.equal(txCtx.trx.isSupported, false);
    });
  });

  it('transactions: a run that throws keeps the writes made before it', async () => {
    await assert.rejects(
      run(ctx, async (txCtx) => {
        await ctx.repo('plainItem').create({ name: 'stays' }, { ctx: txCtx });
        throw new ConformanceRollback();
      }),
      ConformanceRollback,
    );

    assert.deepStrictEqual(await names(ctx), ['stays']);
  });
}
