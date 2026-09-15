/**
 * Tests for join type behavior (LEFT vs INNER) for forward relations.
 *
 * LEFT JOIN (default): ROOT_FIRST strategy, all roots returned including
 * those without matching relations.
 *
 * INNER JOIN: NOT_NULL filter injected automatically, triggers RELATION_FIRST
 * strategy, only roots with matching relations returned.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/join-type.spec.ts
 */
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../../repository/repository.types.js';
import {
  type TestRoot,
  type TestRelation,
  createMinimalRootRelationSet,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Join Type (Forward Relations)', () => {
  describe('Forward relationships (one-to-many)', () => {
    it('should use LEFT JOIN by default (no joinType specified)', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const data = createMinimalRootRelationSet();
      rootRepo.findAndCount.mockResolvedValue([data.roots, 3]);
      peerRepo.findAndCount.mockResolvedValue([data.relations, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - ROOT_FIRST strategy (root called first, then peer)
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);

      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        peerRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // All 3 roots returned (LEFT JOIN behavior)
      expect(result).toHaveLength(3);
      expect(total).toBe(3);

      // Root 1: has relation 1
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1', isLatest: true },
      ]);
      // Root 2: has relations 2 and 3
      expect(result[1].relations).toEqual([
        { id: 2, rootId: 2, title: 'Relation 2', isLatest: true },
        { id: 3, rootId: 2, title: 'Relation 3', isLatest: false },
      ]);
      // Root 3: no relations (LEFT JOIN keeps it)
      expect(result[2].relations).toEqual([]);
    });

    it('should use LEFT JOIN when joinType: "LEFT" is explicitly specified', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const data = createMinimalRootRelationSet();
      rootRepo.findAndCount.mockResolvedValue([data.roots, 3]);
      peerRepo.findAndCount.mockResolvedValue([data.relations, 3]);

      // ACT - explicit LEFT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations', joinType: 'LEFT' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - ROOT_FIRST strategy (LEFT JOIN behavior)
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);

      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        peerRepo.findAndCount.mock.invocationCallOrder[0],
      );

      expect(result).toHaveLength(3);
      expect(total).toBe(3);
    });

    it('should automatically inject NOT_NULL filter for joinType: "INNER"', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        distinctFilter: {
          field: 'isLatest',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const data = createMinimalRootRelationSet();
      // INNER JOIN: only relations with non-null rootId
      const innerJoinRelations = data.relations.filter((r) => r.rootId);

      // Discovery + hydration
      peerRepo.findAndCount
        .mockResolvedValueOnce([innerJoinRelations, 3])
        .mockResolvedValueOnce([innerJoinRelations, 3]);

      // Only roots 1 and 2 have relations (root 3 excluded by INNER JOIN)
      rootRepo.findAndCount.mockResolvedValue([
        data.roots.filter((r) => r.id !== 3),
        2,
      ]);

      // ACT
      const [result] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations', joinType: 'INNER' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - RELATION_FIRST strategy (peer called first)
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      expect(peerRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        rootRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Discovery call: NOT_NULL + distinctFilter injected
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.where).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          {
            field: 'rootId',
            operator: WhereOperator.NOT_NULL,
            relation: 'relations',
          },
          {
            field: 'isLatest',
            operator: WhereOperator.EQ,
            value: true,
            relation: 'relations',
          },
        ],
      });

      // Constrained root fetch: only roots with matching relations
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'id',
        operator: WhereOperator.IN,
        value: [1, 2],
      });

      // Only 2 roots returned (INNER JOIN excludes root 3)
      expect(result).toHaveLength(2);
    });

    it('should preserve existing filters when injecting NOT_NULL for INNER join', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        distinctFilter: {
          field: 'isLatest',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const data = createMinimalRootRelationSet();
      const activeRelations = data.relations.slice(0, 2);

      // Discovery + hydration
      peerRepo.findAndCount
        .mockResolvedValueOnce([activeRelations, 2])
        .mockResolvedValueOnce([activeRelations, 2]);

      rootRepo.findAndCount.mockResolvedValue([data.roots.slice(0, 2), 2]);

      // ACT
      await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'active',
          relation: 'relations',
        },
        join: [{ relation: 'relations', joinType: 'INNER' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Discovery has user filter + injected NOT_NULL + distinctFilter
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.where).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          {
            field: 'status',
            operator: WhereOperator.EQ,
            value: 'active',
            relation: 'relations',
          },
          {
            field: 'rootId',
            operator: WhereOperator.NOT_NULL,
            relation: 'relations',
          },
          {
            field: 'isLatest',
            operator: WhereOperator.EQ,
            value: true,
            relation: 'relations',
          },
        ],
      });
    });

    it('should include both user NOT_NULL and injected NOT_NULL for INNER join', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        distinctFilter: {
          field: 'isLatest',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const data = createMinimalRootRelationSet();

      // Discovery + hydration
      peerRepo.findAndCount
        .mockResolvedValueOnce([data.relations, 3])
        .mockResolvedValueOnce([data.relations, 3]);

      rootRepo.findAndCount.mockResolvedValue([
        data.roots.filter((r) => r.id !== 3),
        2,
      ]);

      // ACT - User provides NOT_NULL + INNER join
      await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'rootId',
          operator: WhereOperator.NOT_NULL,
          relation: 'relations',
        },
        join: [{ relation: 'relations', joinType: 'INNER' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Both user NOT_NULL and injected NOT_NULL appear
      // (deduplication is not performed at the repository level)
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.where).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          {
            field: 'rootId',
            operator: WhereOperator.NOT_NULL,
            relation: 'relations',
          },
          {
            field: 'rootId',
            operator: WhereOperator.NOT_NULL,
            relation: 'relations',
          },
          {
            field: 'isLatest',
            operator: WhereOperator.EQ,
            value: true,
            relation: 'relations',
          },
        ],
      });
    });
  });
});
