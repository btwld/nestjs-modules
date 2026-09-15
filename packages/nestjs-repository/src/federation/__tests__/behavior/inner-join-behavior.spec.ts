/**
 * Behavior tests for INNER JOIN pattern achieved through relation filters.
 *
 * When a relation-tagged filter is present, the orchestrator uses
 * RELATION_FIRST strategy: discovery -> constrained roots -> hydration.
 * This produces INNER JOIN semantics (only roots with matching relations).
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/inner-join-behavior.spec.ts
 */
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../../repository/repository.types.js';
import { Where } from '../../../repository/where.helpers.js';
import {
  type TestRoot,
  type TestRelation,
  createMinimalRootRelationSet,
  createFilteredDataSet,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Inner Join Behavior', () => {
  describe('Relation existence filter (NOT_NULL)', () => {
    it('should constrain root results when relation existence filter present', async () => {
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

      const data = createMinimalRootRelationSet();
      const latestRelations = data.relations.filter((r) => r.isLatest);

      // Discovery: find relations matching NOT_NULL + distinctFilter
      peerRepo.findAndCount
        .mockResolvedValueOnce([latestRelations, latestRelations.length])
        // Hydration
        .mockResolvedValueOnce([latestRelations, latestRelations.length]);

      // Constrained root fetch: only roots 1 and 2
      const constrainedRoots = data.roots.filter((r) => r.id <= 2);
      rootRepo.findAndCount.mockResolvedValue([
        constrainedRoots,
        constrainedRoots.length,
      ]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'rootId',
          operator: WhereOperator.NOT_NULL,
          relation: 'relations',
        },
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Root constrained to discovered IDs
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'id',
        operator: WhereOperator.IN,
        value: [1, 2],
      });
      expect(rootCall?.take).toBe(10);

      // Result verification
      expect(total).toBe(2);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 2]);

      // Enrichment
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1', isLatest: true },
      ]);
      expect(result[1].relations).toEqual([
        { id: 2, rootId: 2, title: 'Relation 2', isLatest: true },
      ]);
    });
  });

  describe('Relation value filter', () => {
    it('should apply INNER JOIN with relation value filters (status=active)', async () => {
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

      const data = createFilteredDataSet();

      // Discovery: active relations -> roots [1, 2]
      peerRepo.findAndCount
        .mockResolvedValueOnce([
          data.activeRelations,
          data.activeRelations.length,
        ])
        // Hydration
        .mockResolvedValueOnce([
          data.activeRelations,
          data.activeRelations.length,
        ]);

      const constrainedRoots = data.roots.filter(
        (r) => r.id === 1 || r.id === 2,
      );
      rootRepo.findAndCount.mockResolvedValue([
        constrainedRoots,
        constrainedRoots.length,
      ]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'active',
          relation: 'relations',
        },
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - RELATION_FIRST strategy
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Discovery call: status=active + distinctFilter
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
            field: 'isLatest',
            operator: WhereOperator.EQ,
            value: true,
            relation: 'relations',
          },
        ],
      });

      expect(total).toBe(2);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 2]);
    });
  });

  describe('Empty relation match', () => {
    it('should return empty result when no relations match filters', async () => {
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

      peerRepo.findAndCount.mockResolvedValueOnce([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'archived',
          relation: 'relations',
        },
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(rootRepo.findAndCount).not.toHaveBeenCalled();

      expect(total).toBe(0);
      expect(result).toEqual([]);
    });
  });

  describe('Combined root and relation filters', () => {
    it('should apply INNER JOIN with combined root and relation filters', async () => {
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

      const activeRelations = [
        { id: 1, rootId: 1, title: 'Feature A', status: 'active' },
        { id: 2, rootId: 2, title: 'Feature B', status: 'active' },
      ] as TestRelation[];

      peerRepo.findAndCount
        .mockResolvedValueOnce([activeRelations, activeRelations.length])
        .mockResolvedValueOnce([activeRelations, activeRelations.length]);

      const constrainedRoots = [
        { id: 1, name: 'Project Alpha' },
        { id: 2, name: 'Project Beta' },
      ] as TestRoot[];
      rootRepo.findAndCount.mockResolvedValue([
        constrainedRoots,
        constrainedRoots.length,
      ]);

      // rootRepo.count called because root filter exists
      rootRepo.count.mockResolvedValue(3);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: Where.and(
          {
            field: 'name',
            operator: WhereOperator.CONTAINS,
            value: 'Project',
          },
          {
            field: 'status',
            operator: WhereOperator.EQ,
            value: 'active',
            relation: 'relations',
          },
        ),
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(rootRepo.count).toHaveBeenCalledTimes(1);

      // Count call: root filter only
      const countCall = rootRepo.count.mock.calls[0][0];
      expect(countCall?.where).toEqual({
        field: 'name',
        operator: WhereOperator.CONTAINS,
        value: 'Project',
      });

      // Discovery call: relation conditions only
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
            field: 'isLatest',
            operator: WhereOperator.EQ,
            value: true,
            relation: 'relations',
          },
        ],
      });

      // Constrained root call: root filter AND id constraint
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual(
        Where.and(
          {
            field: 'name',
            operator: WhereOperator.CONTAINS,
            value: 'Project',
          },
          { field: 'id', operator: WhereOperator.IN, value: [1, 2] },
        ),
      );

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 2]);
      // total = min(rootTotal=3, relTotal=2) = 2
      expect(total).toBe(2);
    });
  });

  describe('Pagination with INNER JOIN', () => {
    it('should handle INNER JOIN with pagination on page 1', async () => {
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

      const page1Relations = [
        { id: 1, rootId: 1, title: 'Task 1', status: 'active' },
        { id: 2, rootId: 2, title: 'Task 2', status: 'active' },
        { id: 3, rootId: 3, title: 'Task 3', status: 'active' },
      ] as TestRelation[];

      peerRepo.findAndCount
        .mockResolvedValueOnce([page1Relations, 5])
        .mockResolvedValueOnce([page1Relations, 3]);

      const page1Roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
      ] as TestRoot[];
      rootRepo.findAndCount.mockResolvedValue([page1Roots, page1Roots.length]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'active',
          relation: 'relations',
        },
        join: [{ relation: 'relations' }],
        take: 3,
        skip: 0,
      });

      // ASSERT
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.take).toBe(3);
      expect(discoveryCall?.skip).toBe(0);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
      expect(total).toBe(5);
    });

    it('should handle INNER JOIN with pagination on page 2', async () => {
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

      const page2Relations = [
        { id: 4, rootId: 4, title: 'Task 4', status: 'active' },
        { id: 5, rootId: 5, title: 'Task 5', status: 'active' },
      ] as TestRelation[];

      peerRepo.findAndCount
        .mockResolvedValueOnce([page2Relations, 5])
        .mockResolvedValueOnce([page2Relations, 2]);

      const page2Roots = [
        { id: 4, name: 'Root 4' },
        { id: 5, name: 'Root 5' },
      ] as TestRoot[];
      rootRepo.findAndCount.mockResolvedValue([page2Roots, page2Roots.length]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'active',
          relation: 'relations',
        },
        join: [{ relation: 'relations' }],
        take: 3,
        skip: 3,
      });

      // ASSERT
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.take).toBe(3);
      expect(discoveryCall?.skip).toBe(3);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([4, 5]);
      expect(total).toBe(5);
    });

    it('should handle pagination when filter reduces results below page size', async () => {
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

      const criticalRelations = [
        { id: 1, rootId: 1, title: 'Critical Bug', status: 'critical' },
        { id: 2, rootId: 3, title: 'Critical Feature', status: 'critical' },
      ] as TestRelation[];

      peerRepo.findAndCount
        .mockResolvedValueOnce([criticalRelations, 2])
        .mockResolvedValueOnce([criticalRelations, 2]);

      const matchingRoots = [
        { id: 1, name: 'Root 1' },
        { id: 3, name: 'Root 3' },
      ] as TestRoot[];
      rootRepo.findAndCount.mockResolvedValue([
        matchingRoots,
        matchingRoots.length,
      ]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'critical',
          relation: 'relations',
        },
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 0,
      });

      // ASSERT
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 3]);
      expect(total).toBe(2);
    });
  });

  describe('Relation sort with INNER JOIN', () => {
    it('should preserve relation sort order in INNER JOIN scenario', async () => {
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

      // Relations sorted by title: Alpha(root2), Beta(root1), Charlie(root3)
      const sortedRelations = [
        { id: 2, rootId: 2, title: 'Alpha Task', status: 'active' },
        { id: 1, rootId: 1, title: 'Beta Task', status: 'active' },
        { id: 3, rootId: 3, title: 'Charlie Task', status: 'active' },
      ] as TestRelation[];

      peerRepo.findAndCount
        .mockResolvedValueOnce([sortedRelations, 3])
        .mockResolvedValueOnce([sortedRelations, 3]);

      const roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
      ] as TestRoot[];
      rootRepo.findAndCount.mockResolvedValue([roots, roots.length]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'active',
          relation: 'relations',
        },
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Discovery call has sort
      const discoveryCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.order).toEqual([
        { field: 'title', order: 'ASC', relation: 'relations' },
      ]);

      // Root ordering follows relation sort: rootId 2, 1, 3
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([2, 1, 3]);
      expect(total).toBe(3);
    });
  });

  describe('Multiple relation filters (AND condition)', () => {
    it('should handle INNER JOIN with multiple relation filters', async () => {
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

      const matchingRelations = [
        {
          id: 1,
          rootId: 1,
          title: 'Active High',
          status: 'active',
          priority: 8,
        },
        {
          id: 2,
          rootId: 3,
          title: 'Active Medium',
          status: 'active',
          priority: 5,
        },
      ] as TestRelation[];

      peerRepo.findAndCount
        .mockResolvedValueOnce([matchingRelations, matchingRelations.length])
        .mockResolvedValueOnce([matchingRelations, matchingRelations.length]);

      const matchingRoots = [
        { id: 1, name: 'Root 1' },
        { id: 3, name: 'Root 3' },
      ] as TestRoot[];
      rootRepo.findAndCount.mockResolvedValue([
        matchingRoots,
        matchingRoots.length,
      ]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: Where.and(
          {
            field: 'status',
            operator: WhereOperator.EQ,
            value: 'active',
            relation: 'relations',
          },
          {
            field: 'priority',
            operator: WhereOperator.GTE,
            value: 5,
            relation: 'relations',
          },
        ),
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Discovery call: both relation filters + distinctFilter
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
            field: 'priority',
            operator: WhereOperator.GTE,
            value: 5,
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

      expect(total).toBe(2);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });
  });
});
