import { describe, expect, it } from 'vitest';

import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { PrimaryKeyImmutableException } from '../../exceptions/primary-key-immutable.exception.js';
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
    this.metadata = {
      ...metadataOf([
        column('id', primaries.includes('id')),
        column('accountId', primaries.includes('accountId')),
        column('name'),
      ]),
      relations: [
        {
          name: 'account',
          targetEntity: 'Account',
          cardinality: 'one',
          on: { from: 'accountId', to: 'id' },
        },
      ],
    };
  }

  readonly mergeBases: Row[] = [];

  protected async doUpdate(
    entity: Row,
    data: DeepPartial<Row>,
    _options?: RepositoryUpdateOptions<Row>,
  ): Promise<Row> {
    this.mergeBases.push(entity);
    this.updated.push(data);
    return this.transform(data);
  }

  protected async doReplace(
    entity: Row,
    data: DeepPartial<Row>,
    _options?: RepositoryUpdateOptions<Row>,
  ): Promise<Row> {
    this.mergeBases.push(entity);
    this.replaced.push(data);
    return this.transform(data);
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
    return this.transform(entity);
  }
  protected async doCreateMany(entities: DeepPartial<Row>[]): Promise<Row[]> {
    return entities.map((entity) => this.transform(entity));
  }
  protected async doUpsert(entity: DeepPartial<Row>): Promise<Row> {
    return this.transform(entity);
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

  transform(entityLike: DeepPartial<Row>): Row {
    return Object.assign(new RowClass(), entityLike);
  }

  merge(mergeInto: Row, ...sources: DeepPartial<Row>[]): Row {
    return Object.assign(mergeInto, ...sources);
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

  describe('a relation on the entity argument of a replace', () => {
    it('does not reach the driver as part of the merge base', async () => {
      const adapter = new TestAdapter();

      await adapter.replace(
        { ...EXISTING, account: { id: 'acct-9' } },
        { name: 'Renamed' },
      );

      expect(adapter.mergeBases).toEqual([
        { id: EXISTING.id, accountId: EXISTING.accountId, name: EXISTING.name },
      ]);
    });
  });

  describe('a relation on the entity argument', () => {
    // A driver resolves a column from its relation object in preference to the
    // column's own scalar, and the entity argument is the merge base — so a
    // relation planted on it decides which row the write lands on, whatever
    // the scalar says. Reproducible against a real driver on an entity with no
    // row scope at all.
    it('does not reach the driver, leaving the scalar to decide', async () => {
      const adapter = new TestAdapter();

      await adapter.update(
        { ...EXISTING, account: { id: 'acct-9' } },
        { name: 'Renamed' },
      );

      expect(adapter.mergeBases).toEqual([
        { id: EXISTING.id, accountId: EXISTING.accountId, name: EXISTING.name },
      ]);
      expect(adapter.mergeBases[0].account).toBeUndefined();
    });
  });

  it('leaves an entity with no primary key columns alone', async () => {
    const adapter = new TestAdapter([]);

    await adapter.update(EXISTING, { id: 'row-2', name: 'Whatever' });

    expect(adapter.updated).toEqual([{ id: 'row-2', name: 'Whatever' }]);
  });
});

describe('the delete family pins the row the entity argument names', () => {
  // These operations act on the entity itself rather than on separate data, so
  // there is no merge to pin. The hazard is the same one update and replace
  // face: a driver resolves a column from its relation object in preference to
  // the column's own scalar, and a driver's own identifying read may take
  // either route. Where the two disagree, the resolver's pre-check and the
  // statement the driver runs can name different rows — so the relation is
  // stripped before either sees the entity.
  const PLANTED: Row = { ...EXISTING, account: { id: 'acct-9' } };

  it.each([
    ['delete', (a: TestAdapter, e: Row) => a.delete(e)],
    ['softDelete', (a: TestAdapter, e: Row) => a.softDelete(e)],
    ['restore', (a: TestAdapter, e: Row) => a.restore(e)],
    ['deleteMany', (a: TestAdapter, e: Row) => a.deleteMany([e])],
  ])('%s hands the driver no relation property', async (_name, run) => {
    const adapter = new TestAdapter();

    await run(adapter, { ...PLANTED });

    expect(adapter.removed).toEqual([
      { id: EXISTING.id, accountId: EXISTING.accountId, name: EXISTING.name },
    ]);
    expect(adapter.removed[0].account).toBeUndefined();
    expect(adapter.removed[0].accountId).toBe(EXISTING.accountId);
  });

  it('does not mutate the caller entity', async () => {
    const adapter = new TestAdapter();
    const entity: Row = { ...PLANTED };

    await adapter.delete(entity);

    expect(entity).toEqual(PLANTED);
  });
});
