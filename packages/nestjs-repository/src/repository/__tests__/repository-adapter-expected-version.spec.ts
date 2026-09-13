import { RuntimeException } from '@concepta/nestjs-core';

import { OptimisticLockException } from '../../exceptions/optimistic-lock.exception.js';

import {
  type TestEntity,
  TestEntityClass,
  TestRepositoryAdapterNoVersion,
  TrackingTestRepositoryAdapter,
  TrackingTestRepositoryAdapterNoVersion,
} from './fixtures/test-repository-adapter.fixture.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function entityWithVersion(
  version: number,
  dateDeleted: Date | null = null,
): TestEntity {
  const entity = new TestEntityClass();
  entity.id = '1';
  entity.version = version;
  entity.dateDeleted = dateDeleted;
  return entity;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RepositoryAdapter expected version', () => {
  let adapter: TrackingTestRepositoryAdapter;

  beforeEach(() => {
    adapter = new TrackingTestRepositoryAdapter('test-entity');
  });

  describe('update', () => {
    it('should delegate to doUpdate when expectedVersion matches', async () => {
      const result = await adapter.update(
        entityWithVersion(3),
        { name: 'x' },
        { expectedVersion: 3 },
      );

      expect(adapter.doUpdateCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });

    it('should reject without calling doUpdate when expectedVersion mismatches', async () => {
      await expect(
        adapter.update(
          entityWithVersion(3),
          { name: 'x' },
          { expectedVersion: 2 },
        ),
      ).rejects.toThrow(OptimisticLockException);

      expect(adapter.doUpdateCalls).toEqual(0);
    });

    it('should delegate unchanged when expectedVersion is omitted', async () => {
      const result = await adapter.update(entityWithVersion(3), {
        name: 'x',
      });

      expect(adapter.doUpdateCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });

    it('should pass a versionGuard to doUpdate even with no expectedVersion', async () => {
      await adapter.update(entityWithVersion(3), { name: 'x' });

      expect(adapter.lastUpdateOptions?.versionGuard).toEqual({
        column: 'version',
        value: 3,
      });
    });

    it('should overwrite a caller-supplied versionGuard rather than honor it', async () => {
      await adapter.update(
        entityWithVersion(3),
        { name: 'x' },
        {
          versionGuard: { column: 'version', value: 999 },
        },
      );

      expect(adapter.lastUpdateOptions?.versionGuard).toEqual({
        column: 'version',
        value: 3,
      });
    });
  });

  describe('replace', () => {
    it('should delegate to doReplace when expectedVersion matches', async () => {
      const result = await adapter.replace(
        entityWithVersion(5),
        { name: 'x' },
        { expectedVersion: 5 },
      );

      expect(adapter.doReplaceCalls).toEqual(1);
      expect(result.name).toEqual('x');
    });

    it('should reject without calling doReplace when expectedVersion mismatches', async () => {
      await expect(
        adapter.replace(
          entityWithVersion(5),
          { name: 'x' },
          { expectedVersion: 4 },
        ),
      ).rejects.toThrow(OptimisticLockException);

      expect(adapter.doReplaceCalls).toEqual(0);
    });

    it('should pass a versionGuard to doReplace even with no expectedVersion', async () => {
      await adapter.replace(entityWithVersion(5), { name: 'x' });

      expect(adapter.lastReplaceOptions?.versionGuard).toEqual({
        column: 'version',
        value: 5,
      });
    });
  });

  describe('delete', () => {
    it('should delegate to doDelete when expectedVersion matches', async () => {
      await adapter.delete(entityWithVersion(1), { expectedVersion: 1 });

      expect(adapter.doDeleteCalls).toEqual(1);
    });

    it('should reject without calling doDelete when expectedVersion mismatches', async () => {
      await expect(
        adapter.delete(entityWithVersion(1), { expectedVersion: 2 }),
      ).rejects.toThrow(OptimisticLockException);

      expect(adapter.doDeleteCalls).toEqual(0);
    });

    it('should delegate unchanged when expectedVersion is omitted', async () => {
      await adapter.delete(entityWithVersion(1));

      expect(adapter.doDeleteCalls).toEqual(1);
    });

    it('should skip the versionGuard when expectedVersion is omitted', async () => {
      await adapter.delete(entityWithVersion(1));

      expect(adapter.lastDeleteOptions?.versionGuard).toBeUndefined();
    });

    it('should pass a versionGuard when expectedVersion is supplied', async () => {
      await adapter.delete(entityWithVersion(1), { expectedVersion: 1 });

      expect(adapter.lastDeleteOptions?.versionGuard).toEqual({
        column: 'version',
        value: 1,
      });
    });
  });

  describe('softDelete', () => {
    it('should delegate to doSoftDelete when expectedVersion matches a live entity', async () => {
      await adapter.softDelete(entityWithVersion(1), { expectedVersion: 1 });

      expect(adapter.doSoftDeleteCalls).toEqual(1);
    });

    it('should reject without calling doSoftDelete when expectedVersion mismatches', async () => {
      await expect(
        adapter.softDelete(entityWithVersion(1), { expectedVersion: 2 }),
      ).rejects.toThrow(OptimisticLockException);

      expect(adapter.doSoftDeleteCalls).toEqual(0);
    });

    it('should conflict rather than no-op on an already-soft-deleted entity with a stale expectedVersion', async () => {
      const entity = entityWithVersion(1, new Date());

      await expect(
        adapter.softDelete(entity, { expectedVersion: 2 }),
      ).rejects.toThrow(OptimisticLockException);

      expect(adapter.doSoftDeleteCalls).toEqual(0);
    });

    it('should still no-op on an already-soft-deleted entity when expectedVersion matches', async () => {
      const entity = entityWithVersion(1, new Date());

      const result = await adapter.softDelete(entity, { expectedVersion: 1 });

      expect(result).toBe(entity);
      expect(adapter.doSoftDeleteCalls).toEqual(0);
    });

    it('should skip the versionGuard when expectedVersion is omitted', async () => {
      await adapter.softDelete(entityWithVersion(1));

      expect(adapter.lastSoftDeleteOptions?.versionGuard).toBeUndefined();
    });
  });

  describe('restore', () => {
    it('should delegate to doRestore when expectedVersion matches', async () => {
      await adapter.restore(entityWithVersion(1, new Date()), {
        expectedVersion: 1,
      });

      expect(adapter.doRestoreCalls).toEqual(1);
    });

    it('should reject without calling doRestore when expectedVersion mismatches', async () => {
      await expect(
        adapter.restore(entityWithVersion(1, new Date()), {
          expectedVersion: 2,
        }),
      ).rejects.toThrow(OptimisticLockException);

      expect(adapter.doRestoreCalls).toEqual(0);
    });

    it('should skip the versionGuard when expectedVersion is omitted', async () => {
      await adapter.restore(entityWithVersion(1, new Date()));

      expect(adapter.lastRestoreOptions?.versionGuard).toBeUndefined();
    });

    it('should pass a versionGuard when expectedVersion is supplied', async () => {
      await adapter.restore(entityWithVersion(1, new Date()), {
        expectedVersion: 1,
      });

      expect(adapter.lastRestoreOptions?.versionGuard).toEqual({
        column: 'version',
        value: 1,
      });
    });
  });

  describe('an entity with no version column', () => {
    let noVersionAdapter: TestRepositoryAdapterNoVersion;

    beforeEach(() => {
      noVersionAdapter = new TestRepositoryAdapterNoVersion('test-entity');
    });

    it('should throw a usage RuntimeException when expectedVersion is supplied', async () => {
      const error = await noVersionAdapter
        .update(entityWithVersion(1), { name: 'x' }, { expectedVersion: 1 })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(RuntimeException);
      if (error instanceof RuntimeException) {
        expect(error.fault).toEqual('usage');
      }
    });

    it('should confirm the entity has no version column', () => {
      expect(noVersionAdapter.exposedGetVersionColumn()).toBeUndefined();
    });

    it('should never receive a versionGuard on update/replace, even with no expectedVersion', async () => {
      const trackingNoVersion = new TrackingTestRepositoryAdapterNoVersion(
        'test-entity',
      );

      await trackingNoVersion.update(entityWithVersion(1), { name: 'x' });
      await trackingNoVersion.replace(entityWithVersion(1), { name: 'x' });

      expect(trackingNoVersion.lastUpdateOptions?.versionGuard).toBeUndefined();
      expect(
        trackingNoVersion.lastReplaceOptions?.versionGuard,
      ).toBeUndefined();
    });
  });
});
