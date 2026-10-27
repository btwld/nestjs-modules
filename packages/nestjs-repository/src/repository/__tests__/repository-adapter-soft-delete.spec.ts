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
    adapter.bind({});
  });

  describe('update', () => {
    it('should reject a soft-deleted entity without calling doUpdate', async () => {
      await expect(
        adapter.update(softDeletedEntity(), { name: 'x' }),
      ).rejects.toThrow(SoftDeletedImmutableException);

      expect(adapter.doUpdateCalls).toEqual(0);
    });

    it('should allow a live entity', async () => {
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
  });

  describe('upsert', () => {
    /** Rewrites the payload's primary key, as a `@BeforeUpsert` hook can. */
    class KeyRewritingAdapter extends TrackingTestRepositoryAdapter {
      protected override async runHooks<T>(
        _methodKey: Parameters<TrackingTestRepositoryAdapter['runHooks']>[0],
        payload: T,
      ): Promise<T> {
        if (payload && typeof payload === 'object') {
          return { ...payload, id: 'deleted-row' };
        }
        return payload;
      }
    }

    it.each([
      ['a different key', { id: 'live-row', name: 'x' }],
      ['no key', { name: 'x' }],
    ])(
      'should check the row a hook names, when the caller named %s',
      async (_case, payload) => {
        const rewriting = new KeyRewritingAdapter('test-entity');
        rewriting.bind({});
        rewriting.findOneResult = softDeletedEntity();

        await expect(rewriting.upsert(payload)).rejects.toThrow(
          SoftDeletedImmutableException,
        );

        expect(rewriting.doFindOneCalls.map((call) => call.where)).toEqual([
          { field: 'id', operator: 'eq', value: 'deleted-row' },
        ]);
        expect(rewriting.doUpsertCalls).toEqual(0);
      },
    );

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

  describe('on an entity with no soft-delete column', () => {
    class NoDeleteDateAdapter extends TrackingTestRepositoryAdapter {
      override readonly metadata = {
        ...new TrackingTestRepositoryAdapter('test-entity').metadata,
        columns: new TrackingTestRepositoryAdapter(
          'test-entity',
        ).metadata.columns.filter((column) => !column.isRemoveDate),
      };
    }

    it.each([
      ['softDelete', (a: NoDeleteDateAdapter) => a.softDelete(liveEntity())],
      ['restore', (a: NoDeleteDateAdapter) => a.restore(liveEntity())],
    ])('should refuse %s before the driver', async (operation, run) => {
      const noDeleteDate = new NoDeleteDateAdapter('test-entity');
      noDeleteDate.bind({});

      await expect(run(noDeleteDate)).rejects.toThrow(
        expect.objectContaining({
          message: `Cannot ${operation} TestEntity: the entity has no soft-delete column`,
          fault: 'usage',
        }),
      );
      expect(noDeleteDate.doSoftDeleteCalls).toEqual(0);
      expect(noDeleteDate.doRestoreCalls).toEqual(0);
    });
  });
});
