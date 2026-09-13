import { SoftDeletedImmutableException } from '../../exceptions/soft-deleted-immutable.exception.js';

import {
  type TestEntity,
  TestEntityClass,
  TrackingTestRepositoryAdapter,
} from './fixtures/test-repository-adapter.fixture.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

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
