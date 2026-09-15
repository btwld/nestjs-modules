/**
 * Behavior tests for combined root + relation filters (RELATION_FIRST).
 *
 * When both root AND relation filters exist:
 * 1. rootRepo.count() for root filter total
 * 2. Discovery via peer repo (relation conditions only)
 * 3. fetchConstrainedRoots with Where.and(rootWhere, idConstraint)
 * 4. Hydration via peer repo
 * 5. Total = min(rootFilterTotal, relationTotal)
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/combined-filters.spec.ts
 */
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../../repository/repository.types.js';
import { Where } from '../../../repository/where.helpers.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Combined Root+Relation Filters', () => {
  describe('Combined Filters with Pagination', () => {
    it('should handle root filter + relation filter with page 1', async () => {
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

      const activeRelations = [
        { id: 1, rootId: 1, title: 'Feature A', status: 'active' },
        { id: 2, rootId: 2, title: 'Feature B', status: 'active' },
        { id: 3, rootId: 4, title: 'Feature C', status: 'active' },
      ] as TestRelation[];

      const projectRoots = [
        { id: 1, name: 'Project Alpha' },
        { id: 2, name: 'Project Beta' },
        { id: 4, name: 'Project Delta' },
      ] as TestRoot[];

      rootRepo.count.mockResolvedValue(5); // 5 total "Project" roots
      rootRepo.findAndCount.mockResolvedValue([projectRoots, 3]);

      peerRepo.findAndCount
        .mockResolvedValueOnce([activeRelations, 3])
        .mockResolvedValueOnce([activeRelations, 3]);

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
        take: 3,
        skip: 0,
      });

      // ASSERT - Call counts
      expect(rootRepo.count).toHaveBeenCalledTimes(1);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);

      // rootRepo.count: root-only where
      const countCall = rootRepo.count.mock.calls[0][0];
      expect(countCall?.where).toEqual({
        field: 'name',
        operator: WhereOperator.CONTAINS,
        value: 'Project',
      });

      // Discovery: relation conditions (user + distinctFilter)
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
      expect(discoveryCall?.take).toBe(3);
      expect(discoveryCall?.skip).toBe(0);

      // Constrained root fetch: Where.and(rootFilter, idConstraint)
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual(
        Where.and(
          {
            field: 'name',
            operator: WhereOperator.CONTAINS,
            value: 'Project',
          },
          { field: 'id', operator: WhereOperator.IN, value: [1, 2, 4] },
        ),
      );
      expect(rootCall?.take).toBe(3);
      expect(rootCall?.skip).toBeUndefined();

      // Results: total = min(rootTotal=5, relTotal=3) = 3
      expect(total).toBe(3);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 2, 4]);

      // Enrichment
      expect(result[0].relations).toEqual([activeRelations[0]]);
      expect(result[1].relations).toEqual([activeRelations[1]]);
      expect(result[2].relations).toEqual([activeRelations[2]]);
    });

    it('should handle multiple root + relation filters with pagination', async () => {
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

      const activeHighPriorityRelations = [
        { id: 1, rootId: 1, title: 'Critical', status: 'active', priority: 10 },
        { id: 2, rootId: 3, title: 'High', status: 'active', priority: 8 },
        { id: 3, rootId: 4, title: 'Important', status: 'active', priority: 7 },
      ] as TestRelation[];

      const filteredRoots = [
        { id: 1, name: 'Project Alpha', companyId: 1 },
        { id: 3, name: 'Project Gamma', companyId: 1 },
        { id: 4, name: 'Project Delta', companyId: 1 },
      ] as TestRoot[];

      rootRepo.count.mockResolvedValue(3);
      rootRepo.findAndCount.mockResolvedValue([filteredRoots, 3]);

      peerRepo.findAndCount
        .mockResolvedValueOnce([activeHighPriorityRelations, 3])
        .mockResolvedValueOnce([activeHighPriorityRelations, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: Where.and(
          {
            field: 'name',
            operator: WhereOperator.CONTAINS,
            value: 'Project',
          },
          { field: 'companyId', operator: WhereOperator.EQ, value: 1 },
          {
            field: 'status',
            operator: WhereOperator.EQ,
            value: 'active',
            relation: 'relations',
          },
          {
            field: 'priority',
            operator: WhereOperator.GTE,
            value: 7,
            relation: 'relations',
          },
        ),
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 0,
      });

      // ASSERT
      expect(rootRepo.count).toHaveBeenCalledTimes(1);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);

      // rootRepo.count: compound root-only where (two root conditions)
      const countCall = rootRepo.count.mock.calls[0][0];
      expect(countCall?.where).toEqual({
        operator: WhereCompoundOperator.AND,
        conditions: [
          {
            field: 'name',
            operator: WhereOperator.CONTAINS,
            value: 'Project',
          },
          { field: 'companyId', operator: WhereOperator.EQ, value: 1 },
        ],
      });

      // Discovery: both relation conditions + distinctFilter
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
            value: 7,
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

      // Constrained root fetch: Where.and(compound_root_where, idConstraint)
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual(
        Where.and(
          {
            operator: WhereCompoundOperator.AND,
            conditions: [
              {
                field: 'name',
                operator: WhereOperator.CONTAINS,
                value: 'Project',
              },
              { field: 'companyId', operator: WhereOperator.EQ, value: 1 },
            ],
          },
          { field: 'id', operator: WhereOperator.IN, value: [1, 3, 4] },
        ),
      );

      expect(total).toBe(3);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 3, 4]);
    });

    it('should handle combined filters when results are reduced below page size', async () => {
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

      const criticalRelations = [
        { id: 1, rootId: 2, title: 'System Outage', status: 'critical' },
        { id: 2, rootId: 5, title: 'Security Breach', status: 'critical' },
      ] as TestRelation[];

      const enterpriseRoots = [
        { id: 2, name: 'Enterprise Suite' },
        { id: 5, name: 'Enterprise Security' },
      ] as TestRoot[];

      rootRepo.count.mockResolvedValue(4); // 4 Enterprise roots total
      rootRepo.findAndCount.mockResolvedValue([enterpriseRoots, 2]);

      peerRepo.findAndCount
        .mockResolvedValueOnce([criticalRelations, 2])
        .mockResolvedValueOnce([criticalRelations, 2]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: Where.and(
          {
            field: 'name',
            operator: WhereOperator.CONTAINS,
            value: 'Enterprise',
          },
          {
            field: 'status',
            operator: WhereOperator.EQ,
            value: 'critical',
            relation: 'relations',
          },
        ),
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(rootRepo.count).toHaveBeenCalledTimes(1);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);

      // Fewer results than page size: total = min(4, 2) = 2
      expect(total).toBe(2);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([2, 5]);

      // Enrichment
      expect(result[0].relations).toEqual([criticalRelations[0]]);
      expect(result[1].relations).toEqual([criticalRelations[1]]);
    });
  });
});
