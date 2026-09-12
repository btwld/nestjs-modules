import { type DeepPartial } from '@concepta/nestjs-core';

import { SoftDeletedImmutableException } from '../../exceptions/soft-deleted-immutable.exception.js';
import { type RepositoryFindOneOptions } from '../interfaces/repository-options.interface.js';

import {
  type TestEntity,
  TestEntityClass,
  TestRepositoryAdapter,
} from './fixtures/test-repository-adapter.fixture.js';

// ─── Tracking subclass ──────────────────────────────────────────────────────
//
// The shared fixture's `doX` methods throw 'not implemented', which already
// proves a guard fired before delegation (a different error than
// `SoftDeletedImmutableException` would surface). This subclass additionally
// makes them succeed, so the allowed paths (`{ force: true }`, live
// entities, no existing row) can assert a write actually went through.
class TrackingTestRepositoryAdapter extends TestRepositoryAdapter {
  doUpdateCalls = 0;
  doReplaceCalls = 0;
  doUpsertCalls = 0;
  doSoftDeleteCalls = 0;
  doFindOneCalls: RepositoryFindOneOptions<TestEntity>[] = [];
  findOneResult: TestEntity | null = null;

  protected override doUpdate(
    entity: TestEntity,
    data: DeepPartial<TestEntity>,
  ): Promise<TestEntity> {
    this.doUpdateCalls++;
    return Promise.resolve(mergeEntity(entity, data));
  }

  protected override doReplace(
    entity: TestEntity,
    data: DeepPartial<TestEntity>,
  ): Promise<TestEntity> {
    this.doReplaceCalls++;
    return Promise.resolve(mergeEntity(entity, data));
  }

  protected override doUpsert(
    entity: DeepPartial<TestEntity>,
  ): Promise<TestEntity> {
    this.doUpsertCalls++;
    return Promise.resolve(this.prepare(entity) ?? new TestEntityClass());
  }

  protected override doSoftDelete(entity: TestEntity): Promise<TestEntity> {
    this.doSoftDeleteCalls++;
    return Promise.resolve({ ...entity, dateDeleted: new Date() });
  }

  protected override doFindOne(
    options: RepositoryFindOneOptions<TestEntity>,
  ): Promise<TestEntity | null> {
    this.doFindOneCalls.push(options);
    return Promise.resolve(this.findOneResult);
  }
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

// A plain `{ ...entity, ...data }` spread widens `dateDeleted` to
// `DeepPartial<Date>` (an object with every `Date` method optional), since
// `data` is typed `DeepPartial<TestEntity>` — this merges by field instead
// so the mocked `doUpdate`/`doReplace` stay `TestEntity`-typed.
function mergeEntity(
  entity: TestEntity,
  data: DeepPartial<TestEntity>,
): TestEntity {
  const merged = new TestEntityClass();
  merged.id = entity.id;
  merged.name = data.name ?? entity.name;
  merged.version = entity.version;
  merged.dateDeleted = entity.dateDeleted;
  return merged;
}

function softDeletedEntity(): TestEntity {
  const entity = new TestEntityClass();
  entity.id = '1';
  entity.dateDeleted = new Date();
  return entity;
}

function liveEntity(): TestEntity {
  const entity = new TestEntityClass();
  entity.id = '1';
  entity.dateDeleted = null;
  return entity;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RepositoryAdapter soft-deleted immutability', () => {
  let adapter: TrackingTestRepositoryAdapter;

  beforeEach(() => {
    adapter = new TrackingTestRepositoryAdapter('test-entity');
  });

  describe('update', () => {
    it('should reject a soft-deleted entity without calling doUpdate', async () => {
      await expect(
        adapter.update(softDeletedEntity(), { name: 'x' }),
      ).rejects.toThrow(SoftDeletedImmutableException);

      expect(adapter.doUpdateCalls).toEqual(0);
    });

    it('should allow a soft-deleted entity when force is set', async () => {
      const result = await adapter.update(
        softDeletedEntity(),
        { name: 'x' },
        { force: true },
      );

      expect(adapter.doUpdateCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });

    it('should allow a live entity without force', async () => {
      const result = await adapter.update(liveEntity(), { name: 'x' });

      expect(adapter.doUpdateCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });
  });

  describe('replace', () => {
    it('should reject a soft-deleted entity without calling doReplace', async () => {
      await expect(
        adapter.replace(softDeletedEntity(), { name: 'x' }),
      ).rejects.toThrow(SoftDeletedImmutableException);

      expect(adapter.doReplaceCalls).toEqual(0);
    });

    it('should allow a soft-deleted entity when force is set', async () => {
      const result = await adapter.replace(
        softDeletedEntity(),
        { name: 'x' },
        { force: true },
      );

      expect(adapter.doReplaceCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });
  });

  describe('upsert', () => {
    it('should reject when the existing row at the primary key is soft-deleted', async () => {
      adapter.findOneResult = softDeletedEntity();

      await expect(adapter.upsert({ id: '1', name: 'x' })).rejects.toThrow(
        SoftDeletedImmutableException,
      );

      expect(adapter.doUpsertCalls).toEqual(0);
    });

    it('should check the existing row with withDeleted: true', async () => {
      adapter.findOneResult = null;

      await adapter.upsert({ id: '1', name: 'x' });

      expect(adapter.doFindOneCalls).toHaveLength(1);
      expect(adapter.doFindOneCalls[0].withDeleted).toEqual(true);
    });

    it('should allow upsert when force is set, skipping the existing-row check', async () => {
      adapter.findOneResult = softDeletedEntity();

      const result = await adapter.upsert(
        { id: '1', name: 'x' },
        { force: true },
      );

      expect(adapter.doFindOneCalls).toHaveLength(0);
      expect(adapter.doUpsertCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });

    it('should skip the existing-row check when no primary key is supplied', async () => {
      await adapter.upsert({ name: 'x' });

      expect(adapter.doFindOneCalls).toHaveLength(0);
      expect(adapter.doUpsertCalls).toEqual(1);
    });

    it('should allow upsert when no existing row is found', async () => {
      adapter.findOneResult = null;

      const result = await adapter.upsert({ id: 'new-id', name: 'x' });

      expect(adapter.doUpsertCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });
  });

  describe('softDelete', () => {
    it('should no-op on an already-soft-deleted entity', async () => {
      const entity = softDeletedEntity();

      const result = await adapter.softDelete(entity);

      expect(result).toBe(entity);
      expect(adapter.doSoftDeleteCalls).toEqual(0);
    });

    it('should delegate to doSoftDelete for a live entity', async () => {
      const result = await adapter.softDelete(liveEntity());

      expect(adapter.doSoftDeleteCalls).toEqual(1);
      expect(result.dateDeleted).not.toBeNull();
    });
  });
});
