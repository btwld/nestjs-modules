import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { EntityAlreadyExistsException } from '../../exceptions/entity-already-exists.exception.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import { AppendOnlyViolationException } from '../exceptions/append-only-violation.exception.js';
import { type WritePolicyRegistration } from '../interfaces/write-policy-registration.interface.js';

class EntityClass {}

interface Row extends PlainLiteralObject {
  id: string;
  name: string;
  version?: number;
}

/**
 * Records which `do*` the adapter reached, so a test can tell "refused before
 * the driver" from "driver happened to do nothing".
 */
class RecordingAdapter extends RepositoryAdapter<Row> {
  readonly metadata: RepositoryMetadataInterface<Row>;
  readonly reached: string[] = [];

  constructor(writePolicy?: WritePolicyRegistration, versioned = false) {
    super('items');
    if (writePolicy) this.setWritePolicy(writePolicy);
    this.metadata = {
      name: 'Item',
      type: EntityClass as Type<Row>,
      columns: [
        { name: 'id', isPrimary: true, isVersion: false, isRemoveDate: false },
        {
          name: 'name',
          isPrimary: false,
          isVersion: false,
          isRemoveDate: false,
        },
        ...(versioned
          ? [
              {
                name: 'version' as const,
                isPrimary: false,
                isVersion: true,
                isRemoveDate: false,
              },
            ]
          : []),
      ],
      relations: [],
    };
  }

  protected async doFind(): Promise<Row[]> {
    this.reached.push('find');
    return [];
  }
  protected async doFindOne(): Promise<Row | null> {
    this.reached.push('findOne');
    return null;
  }
  protected async doCount(): Promise<number> {
    this.reached.push('count');
    return 0;
  }
  protected async doFindAndCount(): Promise<[Row[], number]> {
    this.reached.push('findAndCount');
    return [[], 0];
  }
  protected async doCreate(entity: DeepPartial<Row>): Promise<Row> {
    this.reached.push('create');
    return this.transform(entity);
  }
  protected async doCreateMany(entities: DeepPartial<Row>[]): Promise<Row[]> {
    this.reached.push('createMany');
    return entities.map((entity) => this.transform(entity));
  }
  protected async doUpdate(entity: Row): Promise<Row> {
    this.reached.push('update');
    return entity;
  }
  protected async doUpsert(entity: DeepPartial<Row>): Promise<Row> {
    this.reached.push('upsert');
    return this.transform(entity);
  }
  protected async doReplace(entity: Row): Promise<Row> {
    this.reached.push('replace');
    return entity;
  }
  protected async doDelete(entity: Row): Promise<Row> {
    this.reached.push('delete');
    return entity;
  }
  protected async doDeleteMany(entities: Row[]): Promise<Row[]> {
    this.reached.push('deleteMany');
    return entities;
  }
  protected async doSoftDelete(entity: Row): Promise<Row> {
    this.reached.push('softDelete');
    return entity;
  }
  protected async doRestore(entity: Row): Promise<Row> {
    this.reached.push('restore');
    return entity;
  }
  transform(entityLike: DeepPartial<Row>): Row {
    return { id: '', name: '', ...entityLike };
  }
  merge(mergeInto: Row): Row {
    return mergeInto;
  }
}

const appendOnly = {
  access: 'append-only',
  reason: 'financial lineage is retained',
} as const;

const row: Row = { id: 'a', name: 'original' };
const staleRow: Row = { id: 'a', name: 'original', version: 2 };

/**
 * Every operation that targets a stored row, and how to invoke it. Driving
 * them from one table is what makes "the guard is on all of them" a single
 * assertion rather than seven that can drift apart.
 */
const STORED_ROW_OPERATIONS: {
  operation: string;
  call: (adapter: RecordingAdapter) => Promise<unknown>;
}[] = [
  { operation: 'update', call: (a) => a.update(row, { name: 'changed' }) },
  { operation: 'replace', call: (a) => a.replace(row, { name: 'changed' }) },
  { operation: 'upsert', call: (a) => a.upsert({ id: 'a', name: 'changed' }) },
  { operation: 'delete', call: (a) => a.delete(row) },
  { operation: 'deleteMany', call: (a) => a.deleteMany([row]) },
  { operation: 'softDelete', call: (a) => a.softDelete(row) },
  { operation: 'restore', call: (a) => a.restore(row) },
];

describe('append-only guard', () => {
  describe('on an append-only entity', () => {
    it.each(STORED_ROW_OPERATIONS)('refuses $operation', async ({ call }) => {
      const adapter = new RecordingAdapter(appendOnly);

      await expect(call(adapter)).rejects.toThrow(AppendOnlyViolationException);
    });

    it.each(STORED_ROW_OPERATIONS)(
      'refuses $operation before the driver is reached',
      async ({ call }) => {
        const adapter = new RecordingAdapter(appendOnly);

        await expect(call(adapter)).rejects.toThrow();

        // The point of the guard: the write never gets as far as the driver,
        // so there is nothing to roll back.
        expect(adapter.reached).toEqual([]);
      },
    );

    it.each(STORED_ROW_OPERATIONS)(
      'names $operation in the refusal',
      async ({ operation, call }) => {
        const adapter = new RecordingAdapter(appendOnly);

        try {
          await call(adapter);
          expect.unreachable('should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppendOnlyViolationException);
          if (error instanceof AppendOnlyViolationException) {
            expect(error.context.operation).toBe(operation);
            expect(error.context.entityName).toBe('Item');
            expect(error.httpStatus).toBe(409);
            expect(error.fault).toBe('usage');
            expect(error.errorCode).toBe('APPEND_ONLY_VIOLATION');
          }
        }
      },
    );

    /**
     * A stale version would otherwise surface as an optimistic-lock conflict,
     * and the caller would retry a write that can never succeed.
     */
    it.each([
      {
        operation: 'update',
        call: (a: RecordingAdapter) =>
          a.update(staleRow, { name: 'changed' }, { expectedVersion: 1 }),
      },
      {
        operation: 'replace',
        call: (a: RecordingAdapter) =>
          a.replace(staleRow, { name: 'changed' }, { expectedVersion: 1 }),
      },
      {
        operation: 'delete',
        call: (a: RecordingAdapter) =>
          a.delete(staleRow, { expectedVersion: 1 }),
      },
    ])(
      'refuses $operation before checking a stale version',
      async ({ call }) => {
        const adapter = new RecordingAdapter(appendOnly, true);

        await expect(call(adapter)).rejects.toThrow(
          AppendOnlyViolationException,
        );
      },
    );

    /**
     * `create` is how an append-only record gets written, and how a
     * correction gets appended, so it has to stay open.
     */
    it('allows create', async () => {
      const adapter = new RecordingAdapter(appendOnly);

      await adapter.create({ id: 'b', name: 'new' });

      // A `findOne` precedes it: that is `assertNotExisting`, the existing
      // guarantee that create inserts rather than updates. Worth noting here
      // because it is a check-then-write, so an append-only entity with
      // caller-supplied keys inherits that race — use generated keys.
      expect(adapter.reached).toContain('create');
    });

    /**
     * The default duplicate-key message suggests `upsert`, which is refused
     * here — following it would trade one 409 for another.
     */
    it('does not suggest upsert when create hits an existing key', async () => {
      class ExistingRowAdapter extends RecordingAdapter {
        protected async doFindOne(): Promise<Row | null> {
          return row;
        }
      }
      const adapter = new ExistingRowAdapter(appendOnly);

      const error = await adapter
        .create({ id: 'a', name: 'duplicate' })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(EntityAlreadyExistsException);
      if (error instanceof EntityAlreadyExistsException) {
        expect(error.message).not.toContain('upsert');
        expect(error.message).toContain('Item');
        expect(error.httpStatus).toBe(409);
      }
    });

    it('allows createMany', async () => {
      const adapter = new RecordingAdapter(appendOnly);

      await adapter.createMany([{ id: 'b', name: 'new' }]);

      expect(adapter.reached).toContain('createMany');
    });

    it('allows reads', async () => {
      const adapter = new RecordingAdapter(appendOnly);

      await adapter.find();
      await adapter.findOne({
        where: { field: 'id', operator: 'eq', value: 'a' },
      });

      expect(adapter.reached).toEqual(['find', 'findOne']);
    });

    /**
     * There is deliberately no `force` option, unlike the soft-delete
     * immutability guard — an escape hatch is the failure mode the
     * declaration exists to prevent.
     */
    it('cannot be forced', async () => {
      const adapter = new RecordingAdapter(appendOnly);

      // `force` is the soft-delete guard's escape hatch; it has no effect on
      // this one. (Only the operations that carry it are exercised here —
      // `delete` does not accept it at all.)
      await expect(
        adapter.update(row, { name: 'changed' }, { force: true }),
      ).rejects.toThrow(AppendOnlyViolationException);
      await expect(
        adapter.replace(row, { name: 'changed' }, { force: true }),
      ).rejects.toThrow(AppendOnlyViolationException);
      await expect(
        adapter.upsert({ id: 'a', name: 'changed' }, { force: true }),
      ).rejects.toThrow(AppendOnlyViolationException);
    });
  });

  describe('on a mutable or undeclared entity', () => {
    it.each(STORED_ROW_OPERATIONS)(
      'allows $operation when declared mutable',
      async ({ operation, call }) => {
        const adapter = new RecordingAdapter({ access: 'mutable' });

        await call(adapter);

        expect(adapter.reached).toContain(operation);
      },
    );

    it.each(STORED_ROW_OPERATIONS)(
      'allows $operation when undeclared',
      async ({ operation, call }) => {
        const adapter = new RecordingAdapter();

        await call(adapter);

        expect(adapter.reached).toContain(operation);
      },
    );
  });
});
