/**
 * Validation tests for distinctFilter requirements on many-cardinality relations.
 *
 * Tests that relation sorting requires distinctFilter for many relationships
 * to ensure deterministic root deduplication.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/distinct-filter-validation.spec.ts
 */
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../../repository/repository.types.js';
import { FederationException } from '../../exceptions/federation.exception.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
  mockOneToOneRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - distinctFilter Validation', () => {
  describe('distinctFilter requirement validation', () => {
    it('should throw error when many-cardinality relation lacks distinctFilter', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        // No distinctFilter — should fail for many-cardinality sort
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT & ASSERT
      const error = await orchestrator
        .findAndCount(rootRepo, {
          order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
          join: [{ relation: 'relations' }],
          take: 10,
          skip: 0,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FederationException);
      expect(error.message).toContain('distinctFilter');
      expect(error.message).toContain('many-cardinality');
    });

    it('should succeed when many-cardinality relation has distinctFilter', async () => {
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

      const relationData = [
        { id: 1, rootId: 1, title: 'Alpha Task', isLatest: true },
        { id: 2, rootId: 2, title: 'Beta Task', isLatest: true },
        { id: 3, rootId: 3, title: 'Charlie Task', isLatest: true },
      ] as TestRelation[];

      const rootData = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
      ] as TestRoot[];

      // Discovery + hydration
      peerRepo.findAndCount
        .mockResolvedValueOnce([relationData, 3])
        .mockResolvedValueOnce([relationData, 3]);

      rootRepo.findAndCount.mockResolvedValue([rootData, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 3,
        skip: 0,
      });

      // ASSERT
      expect(result).toHaveLength(3);
      expect(total).toBe(3);

      // Verify distinctFilter was applied in discovery call
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
    });

    it('should automatically inject NOT_NULL filter for relation sorting', async () => {
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

      // Discovery returns empty → short-circuit
      peerRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - NOT_NULL was automatically injected
      expect(result).toEqual([]);
      expect(total).toBe(0);

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
    });

    it('should work fine with one-cardinality relations (no distinctFilter needed)', async () => {
      // ARRANGE - one-to-one relation: no distinctFilter required
      const relation = mockOneToOneRelation('profile', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // Discovery + hydration
      peerRepo.findAndCount
        .mockResolvedValueOnce([
          [{ id: 1, rootId: 1, title: 'Developer Profile' }] as TestRelation[],
          1,
        ])
        .mockResolvedValueOnce([
          [{ id: 1, rootId: 1, title: 'Developer Profile' }] as TestRelation[],
          1,
        ]);

      rootRepo.findAndCount.mockResolvedValue([
        [{ id: 1, name: 'Root 1' }] as TestRoot[],
        1,
      ]);

      // ACT - Should not throw (one-to-one doesn't need distinctFilter)
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'profile' }],
        join: [{ relation: 'profile' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(result).toHaveLength(1);
      expect(total).toBe(1);
    });
  });
});
