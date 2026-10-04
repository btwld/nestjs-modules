import { describe, expect, it } from 'vitest';

import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial, isObject } from '@concepta/nestjs-core';

import { EntityAlreadyExistsException } from '../../exceptions/entity-already-exists.exception.js';
import { PartialPrimaryKeyException } from '../../exceptions/partial-primary-key.exception.js';
import { type RepositoryMetadataInterface } from '../interfaces/repository-metadata.interface.js';
import {
  type RepositoryCreateOptions,
  type RepositoryFindOneOptions,
} from '../interfaces/repository-options.interface.js';
import { RepositoryAdapter } from '../repository-adapter.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface Row extends PlainLiteralObject {
  id: string;
  accountId: string;
  name: string;
}

class RowClass {
  declare id: string;
  declare accountId: string;
  declare name: string;
}

const COLUMN = (name: string, isPrimary = false) => ({
  name,
  isPrimary,
  isRemoveDate: false,
  isVersion: false,
});

/**
 * Adapter whose `doFindOne` answers from a fixed set of rows, so the create
 * guard can be exercised without a driver.
 *
 * `primaries` picks which columns are primary, and the `account` relation maps
 * onto the `accountId` column — the shape where a primary key can arrive by two
 * routes.
 */
class TestAdapter extends RepositoryAdapter<Row> {
  readonly metadata: RepositoryMetadataInterface<Row>;
  readonly reads: RepositoryFindOneOptions<Row>[] = [];
  readonly written: DeepPartial<Row>[] = [];

  constructor(
    private readonly rows: Row[],
    primaries: string[] = ['id'],
  ) {
    super('row');
    this.metadata = {
      name: 'Row',
      type: RowClass as Type<Row>,
      columns: [
        COLUMN('id', primaries.includes('id')),
        COLUMN('accountId', primaries.includes('accountId')),
        COLUMN('name'),
      ],
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

  protected async doFindOne(
    options: RepositoryFindOneOptions<Row>,
  ): Promise<Row | null> {
    this.reads.push(options);

    const where = Reflect.get(options, 'where') ?? {};
    const conditions = Reflect.get(where, 'conditions') ?? [where];

    return (
      this.rows.find((row) =>
        conditions.every(
          (condition: PlainLiteralObject) =>
            row[condition.field] === condition.value,
        ),
      ) ?? null
    );
  }

  protected async doCreate(entity: DeepPartial<Row>): Promise<Row> {
    this.written.push(entity);
    return this.transform(entity);
  }

  protected async doCreateMany(
    entities: DeepPartial<Row>[],
    _options?: RepositoryCreateOptions,
  ): Promise<Row[]> {
    this.written.push(...entities);
    return entities.map((entity) => this.transform(entity));
  }

  // Unused by these specs, but required by the abstract base.
  protected async doFind(): Promise<Row[]> {
    return [];
  }
  protected async doCount(): Promise<number> {
    return 0;
  }
  protected async doFindAndCount(): Promise<[Row[], number]> {
    return [[], 0];
  }
  protected async doUpdate(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doUpsert(entity: DeepPartial<Row>): Promise<Row> {
    return this.transform(entity);
  }
  protected async doReplace(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doDelete(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doDeleteMany(entities: Row[]): Promise<Row[]> {
    return entities;
  }
  protected async doSoftDelete(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doRestore(entity: Row): Promise<Row> {
    return entity;
  }

  /**
   * Settles a relation object into the scalar column it backs, as a driver
   * does — the behaviour the create guard relies on to see a key supplied as
   * `{ account: { id } }` rather than `{ accountId }`.
   */
  transform(entityLike: DeepPartial<Row>): Row {
    const row = Object.assign(new RowClass(), entityLike);

    for (const relation of this.metadata.relations ?? []) {
      const related = row[relation.name];
      if (row[relation.on.from] === undefined && isObject(related)) {
        row[relation.on.from] = Reflect.get(related, relation.on.to);
      }
    }

    return row;
  }

  merge(mergeInto: Row, ...sources: DeepPartial<Row>[]): Row {
    return Object.assign(mergeInto, ...sources);
  }
}

const EXISTING: Row = { id: 'row-1', accountId: 'acct-1', name: 'Existing' };

// ─── Specs ───────────────────────────────────────────────────────────────────

describe('create guard', () => {
  it('refuses a create whose primary key already names a row', async () => {
    const adapter = new TestAdapter([EXISTING]);

    await expect(
      adapter.create({ id: EXISTING.id, name: 'Hijacked' }),
    ).rejects.toThrow(EntityAlreadyExistsException);
    expect(adapter.written).toEqual([]);
  });

  it('refuses through createMany, before anything is written', async () => {
    const adapter = new TestAdapter([EXISTING]);

    await expect(
      adapter.createMany([
        { name: 'Innocent' },
        { id: EXISTING.id, name: 'Hijacked' },
      ]),
    ).rejects.toThrow(EntityAlreadyExistsException);
    expect(adapter.written).toEqual([]);
  });

  it('allows a create with no primary key, without reading', async () => {
    const adapter = new TestAdapter([EXISTING]);

    await expect(adapter.create({ name: 'New' })).resolves.toMatchObject({
      name: 'New',
    });
    expect(adapter.reads).toEqual([]);
  });

  it('allows a create whose primary key names no row', async () => {
    const adapter = new TestAdapter([EXISTING]);

    await expect(
      adapter.create({ id: 'row-2', name: 'New' }),
    ).resolves.toMatchObject({ id: 'row-2' });
  });

  it('reads with withDeleted — a soft-deleted row still holds its key', async () => {
    const adapter = new TestAdapter([EXISTING]);

    await adapter.create({ id: 'row-2', name: 'New' });

    expect(adapter.reads[0]).toEqual(
      expect.objectContaining({ withDeleted: true }),
    );
  });

  describe('a primary key that is also a join column', () => {
    // A driver resolves the column from the relation when the scalar is
    // absent, and prefers it, so reading only the scalar saw no key at all and
    // let the write through onto whatever row the relation named.
    it('refuses a key supplied through the relation object', async () => {
      const adapter = new TestAdapter([EXISTING], ['accountId']);

      await expect(
        adapter.create({ account: { id: EXISTING.accountId }, name: 'Hijack' }),
      ).rejects.toThrow(EntityAlreadyExistsException);
      expect(adapter.written).toEqual([]);
    });

    it('allows a relation-supplied key that names no row', async () => {
      const adapter = new TestAdapter([EXISTING], ['accountId']);

      await expect(
        adapter.create({ account: { id: 'acct-2' }, name: 'New' }),
      ).resolves.toBeDefined();
    });

    it('still reads the scalar when it is the one supplied', async () => {
      const adapter = new TestAdapter([EXISTING], ['accountId']);

      await expect(
        adapter.create({ accountId: EXISTING.accountId, name: 'Hijack' }),
      ).rejects.toThrow(EntityAlreadyExistsException);
    });
  });

  describe('composite primary keys', () => {
    it('refuses only when every column matches', async () => {
      const adapter = new TestAdapter([EXISTING], ['id', 'accountId']);

      await expect(
        adapter.create({
          id: EXISTING.id,
          accountId: EXISTING.accountId,
          name: 'Hijack',
        }),
      ).rejects.toThrow(EntityAlreadyExistsException);

      await expect(
        adapter.create({ id: EXISTING.id, accountId: 'other', name: 'New' }),
      ).resolves.toBeDefined();
    });

    it('refuses a partial key, naming the missing column', async () => {
      // Left to the database this is a 500 reporting that it cannot *update* a
      // row — for a call to `create`, naming no column. A partial key also
      // cannot be looked up, so the existence check never runs: refusing is
      // the only answer that tells the caller what is wrong.
      const adapter = new TestAdapter([EXISTING], ['id', 'accountId']);

      await expect(
        adapter.create({ id: EXISTING.id, name: 'Partial' }),
      ).rejects.toThrow(PartialPrimaryKeyException);

      await expect(
        adapter.create({ id: EXISTING.id, name: 'Partial' }),
      ).rejects.toMatchObject({ context: { missing: ['accountId'] } });

      expect(adapter.reads).toEqual([]);
    });

    it('allows every key column absent, which is a generated key', async () => {
      const adapter = new TestAdapter([EXISTING], ['id', 'accountId']);

      await expect(
        adapter.create({ name: 'Generated' }),
      ).resolves.toBeDefined();
      expect(adapter.reads).toEqual([]);
    });

    it('does not refuse a partial key on a single-column key', async () => {
      // One column means there is no such thing as partial: absent is the
      // generated-key case.
      const adapter = new TestAdapter([EXISTING], ['id']);

      await expect(
        adapter.create({ name: 'Generated' }),
      ).resolves.toBeDefined();
    });
  });
});
