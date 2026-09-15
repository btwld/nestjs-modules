/**
 * Behavior tests for relation sort strategy (RELATION_FIRST).
 *
 * Relation sort causes RELATION_FIRST sequencing:
 * 1. Discovery: peer query with sort + injected filters + pagination
 * 2. Root fetch: constrained to discovered root IDs
 * 3. Hydration: peer query with FK constraint for enrichment
 * 4. Reorder: roots reordered to match discovery order
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/relation-sort-behavior.spec.ts
 */
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../../repository/repository.types.js';
import {
  type TestRoot,
  type TestRelation,
  createRelationSortByTitleSet,
  createRelationSortByPrioritySet,
  createRelationSortPaginationSet,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Relation Sort Strategy', () => {
  describe('Forward relationship relation sort', () => {
    it('should sort roots by relation field with distinctFilter and NOT_NULL filter', async () => {
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
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createRelationSortByTitleSet();

      // Discovery: first 3 relations sorted by title (one per unique root)
      peerRepo.findAndCount
        .mockResolvedValueOnce([data.relationsByTitle.slice(0, 3), 3])
        // Hydration: all 4 relations for discovered roots
        .mockResolvedValueOnce([data.relationsByTitle, 4]);

      // Root fetch: constrained to discovered root IDs
      rootRepo.findAndCount.mockResolvedValue([data.rootsInNaturalOrder, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Handler call verification
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Relation called first (RELATION_FIRST strategy)
      expect(peerRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        rootRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Discovery call (call 0): injected NOT_NULL + distinctFilter + sort
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
      expect(discoveryCall?.order).toEqual([
        { field: 'title', order: 'ASC', relation: 'relations' },
      ]);
      expect(discoveryCall?.take).toBe(10);
      expect(discoveryCall?.skip).toBe(0);

      // Hydration call (call 1): same conditions + FK constraint
      const hydrationCall = peerRepo.findAndCount.mock.calls[1][0];
      expect(hydrationCall?.where).toEqual({
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
          {
            field: 'rootId',
            operator: WhereOperator.IN,
            value: [2, 1, 3],
          },
        ],
      });

      // Root fetch: constrained to discovered IDs
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'id',
        operator: WhereOperator.IN,
        value: [2, 1, 3],
      });

      // ASSERT - Result verification
      expect(total).toBe(3);
      expect(result).toHaveLength(3);
      // Roots reordered by relation sort: Alpha(rootId:2), Beta(rootId:1), Charlie(rootId:3)
      expect(result.map((r) => r.id)).toEqual([2, 1, 3]);

      // Verify enrichment
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 2, title: 'Alpha Task' },
      ]);
      expect(result[1].relations).toEqual([
        { id: 2, rootId: 1, title: 'Beta Task' },
        { id: 4, rootId: 1, title: 'Delta Task' },
      ]);
      expect(result[2].relations).toEqual([
        { id: 3, rootId: 3, title: 'Charlie Task' },
      ]);
    });

    it('should handle relation sort with additional AND filters', async () => {
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
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createRelationSortByPrioritySet();

      // Only relations with priority >= 5, deduplicated by rootId
      const highPriorityRelations = data.relationsByPriority
        .filter((r) => r.priority! >= 5)
        .filter(
          (r, index, array) =>
            array.findIndex((x) => x.rootId === r.rootId) === index,
        );

      // All high-priority relations (no dedup) for hydration
      const allHighPriority = data.relationsByPriority.filter(
        (r) => r.priority! >= 5,
      );

      // Discovery: unique high-priority relations sorted by priority DESC
      peerRepo.findAndCount
        .mockResolvedValueOnce([highPriorityRelations, 3])
        // Hydration: all high-priority relations
        .mockResolvedValueOnce([allHighPriority, 4]);

      // Root fetch: constrained to discovered root IDs
      rootRepo.findAndCount.mockResolvedValue([data.uniqueRootsInOrder, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'priority',
          operator: WhereOperator.GTE,
          value: 5,
          relation: 'relations',
        },
        order: [{ field: 'priority', order: 'DESC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Handler call verification
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Relation called first (RELATION_FIRST strategy)
      expect(peerRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        rootRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Discovery call (call 0): user filter + injected NOT_NULL + distinctFilter + sort
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.where).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          {
            field: 'priority',
            operator: WhereOperator.GTE,
            value: 5,
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
      expect(discoveryCall?.order).toEqual([
        { field: 'priority', order: 'DESC', relation: 'relations' },
      ]);
      expect(discoveryCall?.take).toBe(10);
      expect(discoveryCall?.skip).toBe(0);

      // ASSERT - Result verification
      expect(total).toBe(3);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('should deduplicate roots when multiple relations match', async () => {
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
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createRelationSortByPrioritySet();

      // Deduplicated by rootId (distinctFilter effect)
      const uniqueRelations = data.relationsByPriority.filter(
        (r, index, array) =>
          array.findIndex((x) => x.rootId === r.rootId) === index,
      );

      // Discovery: unique relations sorted by priority DESC
      peerRepo.findAndCount
        .mockResolvedValueOnce([uniqueRelations, 3])
        // Hydration: all relations
        .mockResolvedValueOnce([
          data.relationsByPriority,
          data.relationsByPriority.length,
        ]);

      // Root fetch: constrained to discovered root IDs
      rootRepo.findAndCount.mockResolvedValue([data.uniqueRootsInOrder, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'priority', order: 'DESC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Handler call verification
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Roots appear only once despite multiple relations
      expect(total).toBe(3);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('should return empty result when no relations match with sort', async () => {
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
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      // Discovery returns empty
      peerRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'archived',
          relation: 'relations',
        },
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - No relations found, so root not called
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(0);

      expect(result).toEqual([]);
      expect(total).toBe(0);
    });

    it('should apply relation sort with pagination correctly', async () => {
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
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createRelationSortPaginationSet();
      const firstPageRelations = data.allRelationsSorted.slice(0, 5);

      // Discovery: first 5 sorted relations (page 1)
      peerRepo.findAndCount
        .mockResolvedValueOnce([firstPageRelations, 10])
        // Hydration: same 5 relations for enrichment
        .mockResolvedValueOnce([firstPageRelations, 5]);

      // Root fetch: constrained to first-page root IDs
      rootRepo.findAndCount.mockResolvedValue([data.firstPageRoots, 5]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 0,
      });

      // ASSERT - Handler call verification
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Discovery call (call 0): pagination take=5, skip=0
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.order).toEqual([
        { field: 'title', order: 'ASC', relation: 'relations' },
      ]);
      expect(discoveryCall?.take).toBe(5);
      expect(discoveryCall?.skip).toBe(0);

      // Root fetch: constrained to page 1 IDs
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'id',
        operator: WhereOperator.IN,
        value: [5, 2, 8, 1, 9],
      });

      // ASSERT - Result verification
      expect(total).toBe(10);
      expect(result).toHaveLength(5);
      expect(result.map((r) => r.id)).toEqual([5, 2, 8, 1, 9]);
    });

    it('should apply relation sort with pagination correctly for page 2', async () => {
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
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createRelationSortPaginationSet();
      const secondPageRelations = data.allRelationsSorted.slice(5, 10);

      // Discovery: second 5 sorted relations (page 2, skip=5)
      peerRepo.findAndCount
        .mockResolvedValueOnce([secondPageRelations, 10])
        // Hydration: same 5 relations for enrichment
        .mockResolvedValueOnce([secondPageRelations, 5]);

      // Root fetch: constrained to second-page root IDs
      rootRepo.findAndCount.mockResolvedValue([data.secondPageRoots, 5]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 5,
      });

      // ASSERT - Handler call verification
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Discovery call (call 0): pagination take=5, skip=5
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.order).toEqual([
        { field: 'title', order: 'ASC', relation: 'relations' },
      ]);
      expect(discoveryCall?.take).toBe(5);
      expect(discoveryCall?.skip).toBe(5);

      // Root fetch: constrained to page 2 IDs
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'id',
        operator: WhereOperator.IN,
        value: [4, 7, 3, 6, 10],
      });

      // ASSERT - Result verification
      expect(total).toBe(10);
      expect(result).toHaveLength(5);
      expect(result.map((r) => r.id)).toEqual([4, 7, 3, 6, 10]);
    });
  });
});
