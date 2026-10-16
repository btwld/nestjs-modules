import { describe, expect, it } from 'vitest';

import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { InvalidColumnValueException } from '../../exceptions/invalid-column-value.exception.js';
import { PrimaryKeyImmutableException } from '../../exceptions/primary-key-immutable.exception.js';
import { RelationWriteException } from '../../exceptions/relation-write.exception.js';
import { type RepositoryMetadataInterface } from '../interfaces/repository-metadata.interface.js';
import { type RepositoryUpdateOptions } from '../interfaces/repository-options.interface.js';
import { RepositoryAdapter } from '../repository-adapter.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

type Row = PlainLiteralObject;

/** Carries an index signature so it satisfies `Type<PlainLiteralObject>`. */
class RowClass {
  [key: string]: unknown;
}

const column = (name: string, isPrimary = false) => ({
  name,
  isPrimary,
  isRemoveDate: false,
  isVersion: false,
});

const metadataOf = (columns: ReturnType<typeof column>[]) => ({
  name: 'Row',
  type: RowClass,
  urn: 'urn:memory:Row',
  columns,
});

/**
 * Records what reached the driver, so a refusal can be distinguished from a
 * write that happened to target the right row anyway.
 */
class TestAdapter extends RepositoryAdapter<Row> {
  readonly metadata: RepositoryMetadataInterface<Row>;
  readonly updated: DeepPartial<Row>[] = [];
  readonly replaced: DeepPartial<Row>[] = [];

  constructor(primaries: string[] = ['id']) {
    super('row');
    this.bind({});
    this.metadata = {
      ...metadataOf([
        column('id', primaries.includes('id')),
        column('accountId', primaries.includes('accountId')),
        column('name'),
        { ...column('dateDeleted'), isRemoveDate: true },
      ]),
      relations: [
        {
          name: 'account',
          targetEntity: 'Account',
          targetUrn: 'urn:memory:Account',
          targetColumns: [column('id', true)],
          cardinality: 'one',
          on: { from: 'accountId', to: 'id' },
          foreignKey: [{ from: 'accountId', to: 'id' }],
        },
      ],
    };
  }

  readonly mergeBases: Row[] = [];

  protected async doUpdate(
    entity: Row,
    data: DeepPartial<Row>,
    _options?: RepositoryUpdateOptions,
  ): Promise<Row> {
    this.mergeBases.push(entity);
    this.updated.push(data);
    return this.toRow(data);
  }

  protected async doReplace(
    entity: Row,
    data: DeepPartial<Row>,
    _options?: RepositoryUpdateOptions,
  ): Promise<Row> {
    this.mergeBases.push(entity);
    this.replaced.push(data);
    return this.toRow(data);
  }

  // Unused here, but required by the abstract base.
  protected async doFind(): Promise<Row[]> {
    return [];
  }
  protected async doFindOne(): Promise<Row | null> {
    return null;
  }
  protected async doCount(): Promise<number> {
    return 0;
  }
  protected async doFindAndCount(): Promise<[Row[], number]> {
    return [[], 0];
  }
  protected async doCreate(entity: DeepPartial<Row>): Promise<Row> {
    return this.toRow(entity);
  }
  protected async doCreateMany(entities: DeepPartial<Row>[]): Promise<Row[]> {
    return entities.map((entity) => this.toRow(entity));
  }
  protected async doUpsert(entity: DeepPartial<Row>): Promise<Row> {
    return this.toRow(entity);
  }
  readonly removed: Row[] = [];

  protected async doDelete(entity: Row): Promise<Row> {
    this.removed.push(entity);
    return entity;
  }
  protected async doDeleteMany(entities: Row[]): Promise<Row[]> {
    this.removed.push(...entities);
    return entities;
  }
  protected async doSoftDelete(entity: Row): Promise<Row> {
    this.removed.push(entity);
    return entity;
  }
  protected async doRestore(entity: Row): Promise<Row> {
    this.removed.push(entity);
    return entity;
  }

  toRow(entityLike: DeepPartial<Row>): Row {
    return Object.assign(new RowClass(), entityLike);
  }
}

const EXISTING: Row = { id: 'row-1', accountId: 'acct-1', name: 'Existing' };

// ─── Specs ───────────────────────────────────────────────────────────────────

describe('primary key immutability on update and replace', () => {
  it('refuses an update whose data names a different row', async () => {
    const adapter = new TestAdapter();

    await expect(
      adapter.update(EXISTING, { id: 'row-2', name: 'Redirected' }),
    ).rejects.toThrow(PrimaryKeyImmutableException);
    expect(adapter.updated).toEqual([]);
  });

  it('refuses a replace whose data names a different row', async () => {
    const adapter = new TestAdapter();

    await expect(
      adapter.replace(EXISTING, { id: 'row-2', name: 'Redirected' }),
    ).rejects.toThrow(PrimaryKeyImmutableException);
    expect(adapter.replaced).toEqual([]);
  });

  it('names every changed primary column', async () => {
    const adapter = new TestAdapter(['id', 'accountId']);

    // The structured context rather than the message prose: the columns are
    // the contract, the wording is not.
    await expect(
      adapter.update(EXISTING, { id: 'row-2', accountId: 'acct-2' }),
    ).rejects.toMatchObject({
      context: { columns: ['id', 'accountId'] },
    });
  });

  it('allows data that repeats the same primary key', async () => {
    const adapter = new TestAdapter();

    await adapter.update(EXISTING, { id: EXISTING.id, name: 'Renamed' });

    expect(adapter.updated).toEqual([{ id: EXISTING.id, name: 'Renamed' }]);
  });

  it('compares a binary primary key by its bytes', async () => {
    const adapter = new TestAdapter();
    const entity: Row = { ...EXISTING, id: Buffer.from([1, 2]) };

    await adapter.update(entity, { id: Buffer.from([1, 2]), name: 'Renamed' });
    await expect(
      adapter.update(entity, { id: Buffer.from([1, 3]) }),
    ).rejects.toThrow(PrimaryKeyImmutableException);

    expect(adapter.updated).toHaveLength(1);
  });

  it('allows data that does not mention the primary key', async () => {
    const adapter = new TestAdapter();

    await adapter.update(EXISTING, { name: 'Renamed' });

    expect(adapter.updated).toEqual([{ name: 'Renamed' }]);
  });

  it('does not mutate the caller entity while probing', async () => {
    const adapter = new TestAdapter();
    const entity: Row = { ...EXISTING };

    await expect(adapter.update(entity, { id: 'row-2' })).rejects.toThrow(
      PrimaryKeyImmutableException,
    );
    expect(entity).toEqual(EXISTING);
  });

  it('refuses a partial composite key change', async () => {
    const adapter = new TestAdapter(['id', 'accountId']);

    await expect(
      adapter.update(EXISTING, { accountId: 'acct-2' }),
    ).rejects.toThrow(PrimaryKeyImmutableException);
    expect(adapter.updated).toEqual([]);
  });

  // This fixture's `merge` copies properties as given, so nothing but the
  // repository stands between the relation object and the driver.
  it.each([
    ['update', (a: TestAdapter, data: Row) => a.update(EXISTING, data)],
    ['replace', (a: TestAdapter, data: Row) => a.replace(EXISTING, data)],
  ])('refuses on %s a key sent through a relation object', async (_n, run) => {
    const adapter = new TestAdapter(['id', 'accountId']);

    await expect(run(adapter, { account: { id: 'acct-2' } })).rejects.toThrow(
      RelationWriteException,
    );
    expect(adapter.updated).toEqual([]);
    expect(adapter.replaced).toEqual([]);
  });

  describe('a relation on the entity argument', () => {
    // A driver resolves a column from its relation object in preference to the
    // column's own scalar, so a relation on the stored row would decide which
    // row the write lands on, whatever the scalar says. It never reaches the
    // driver, leaving the scalar to decide.
    it.each([
      ['update', (a: TestAdapter, e: Row) => a.update(e, { name: 'Renamed' })],
      [
        'replace',
        (a: TestAdapter, e: Row) => a.replace(e, { name: 'Renamed' }),
      ],
    ])('is left out of %s', async (_name, run) => {
      const adapter = new TestAdapter();

      await run(adapter, { ...EXISTING, account: { id: 'acct-9' } });

      expect(adapter.mergeBases.map((row) => Object.keys(row))).toEqual([
        Object.keys(EXISTING),
      ]);
    });
  });

  describe('a hook that rewrites the primary key', () => {
    // The guard runs inside the permeator's callback, so it sees the payload
    // hooks produced rather than the one the caller passed. A hook is trusted
    // code, but redirecting a write onto another row is a repository-level
    // error whatever wrote it — and on a scoped entity it would be the scope
    // refusal that surfaced instead, blaming the caller for the hook's edit.
    // Overriding `runHooks` is what the permeator calls, so this produces the
    // same post-hook payload a real `@BeforeUpdate` would.
    class HookRewritingAdapter extends TestAdapter {
      protected async runHooks<T>(
        _methodKey: Parameters<TestAdapter['runHooks']>[0],
        payload: T,
      ): Promise<T> {
        if (payload && typeof payload === 'object') {
          return { ...payload, id: 'row-2' };
        }
        return payload;
      }
    }

    it.each([
      [
        'update',
        (a: HookRewritingAdapter) => a.update(EXISTING, { name: 'X' }),
      ],
      [
        'replace',
        (a: HookRewritingAdapter) => a.replace(EXISTING, { name: 'X' }),
      ],
    ])('is refused on %s, though the caller named no key', async (_n, run) => {
      const adapter = new HookRewritingAdapter();

      await expect(run(adapter)).rejects.toThrow(PrimaryKeyImmutableException);
      expect(adapter.updated).toEqual([]);
      expect(adapter.replaced).toEqual([]);
    });
  });

  describe('a payload whose key changes between reads', () => {
    class AccessorAdapter extends TestAdapter {
      protected async runHooks<T>(
        _methodKey: Parameters<TestAdapter['runHooks']>[0],
        payload: T,
      ): Promise<T> {
        if (!payload || typeof payload !== 'object') return payload;
        let reads = 0;
        return Object.defineProperty({ ...payload }, 'id', {
          enumerable: true,
          get: () => (reads++ === 0 ? EXISTING.id : 'row-2'),
        });
      }
    }

    it.each([
      ['update', (a: AccessorAdapter) => a.update(EXISTING, { name: 'X' })],
      ['replace', (a: AccessorAdapter) => a.replace(EXISTING, { name: 'X' })],
    ])('writes on %s the key the check saw', async (_n, run) => {
      const adapter = new AccessorAdapter();

      await run(adapter);

      expect([...adapter.updated, ...adapter.replaced]).toEqual([
        { id: EXISTING.id, name: 'X' },
      ]);
    });
  });

  it('leaves an entity with no primary key columns alone', async () => {
    const adapter = new TestAdapter([]);

    await adapter.update(EXISTING, { id: 'row-2', name: 'Whatever' });

    expect(adapter.updated).toEqual([{ id: 'row-2', name: 'Whatever' }]);
  });
});

describe('the delete family pins the row the entity argument names', () => {
  // These operations act on the entity itself rather than on separate data.
  // The hazard is the one update and replace face: a driver resolves a column
  // from its relation object in preference to the column's own scalar, so the
  // resolver's pre-check and the statement the driver runs could name
  // different rows. A relation on the entity is left out before either sees
  // it.
  const PLANTED: Row = { ...EXISTING, account: { id: 'acct-9' } };

  it.each([
    ['delete', (a: TestAdapter, e: Row) => a.delete(e)],
    ['softDelete', (a: TestAdapter, e: Row) => a.softDelete(e)],
    ['restore', (a: TestAdapter, e: Row) => a.restore(e)],
    ['deleteMany', (a: TestAdapter, e: Row) => a.deleteMany([e])],
  ])('%s hands the driver no relation property', async (_name, run) => {
    const adapter = new TestAdapter();

    await run(adapter, { ...PLANTED });

    expect(adapter.removed.map((row) => Object.keys(row))).toEqual([
      Object.keys(EXISTING),
    ]);
  });

  it.each([
    ['an object', { id: 'row-9' }],
    ['a function', () => 'row-9'],
  ])('refuses %s in a key column of the entity', async (_case, key) => {
    const adapter = new TestAdapter();

    await expect(adapter.delete({ ...EXISTING, id: key })).rejects.toThrow(
      InvalidColumnValueException,
    );
    expect(adapter.removed).toEqual([]);
  });

  it('leaves out a property that is not a column', async () => {
    const adapter = new TestAdapter();

    // An entity class built with `new` carries what its constructor sets.
    await adapter.delete({ ...EXISTING, featured: false });

    expect(adapter.removed.map((row) => Object.keys(row))).toEqual([
      Object.keys(EXISTING),
    ]);
  });

  it('leaves off a property with no value, without mutating the caller', async () => {
    const adapter = new TestAdapter();
    const entity: Row = { ...EXISTING, unset: undefined };

    await adapter.delete(entity);

    expect(adapter.removed.map((row) => Object.keys(row))).toEqual([
      Object.keys(EXISTING),
    ]);
    expect(Object.keys(entity)).toContain('unset');
  });
});
