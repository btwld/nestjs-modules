/**
 * Validation tests for relation sort requirements.
 *
 * Relation sort on many-cardinality relations requires distinctFilter
 * configuration to ensure deterministic deduplication.
 * Tests various invalid configurations and validates helpful error messages.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/relation-sort-validation.spec.ts
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import { FederationException } from '../../exceptions/federation.exception.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Relation Sort Validation', () => {
  describe('Forward relationship validation', () => {
    it('should throw error when relation sort lacks distinctFilter', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        // No distinctFilter
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

      // No handlers should be called when validation fails
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(0);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(0);
    });

    it('should throw error when relation sort has relation filters but no distinctFilter', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        // No distinctFilter — filters alone don't satisfy the requirement
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT & ASSERT
      const error = await orchestrator
        .findAndCount(rootRepo, {
          where: {
            field: 'status',
            operator: WhereOperator.EQ,
            value: 'active',
            relation: 'relations',
          },
          order: [{ field: 'priority', order: 'DESC', relation: 'relations' }],
          join: [{ relation: 'relations' }],
          take: 10,
          skip: 0,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FederationException);
      expect(error.message).toContain('distinctFilter');

      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(0);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(0);
    });

    it('should throw error when relation sort has multiple filters but no distinctFilter', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        // No distinctFilter
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT & ASSERT
      const error = await orchestrator
        .findAndCount(rootRepo, {
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
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FederationException);
      expect(error.message).toContain('distinctFilter');

      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(0);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(0);
    });

    it('should throw error when relation sort has AND filters on non-join fields only', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        // No distinctFilter
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT & ASSERT — Multiple relation filters, none with distinctFilter
      const error = await orchestrator
        .findAndCount(rootRepo, {
          where: {
            operator: 'and' as never,
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
            ],
          },
          order: [{ field: 'createdAt', order: 'DESC', relation: 'relations' }],
          join: [{ relation: 'relations' }],
          take: 10,
          skip: 0,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FederationException);
      expect(error.message).toContain('distinctFilter');

      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(0);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(0);
    });

    it('should provide helpful error message with relation name', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        // No distinctFilter
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT & ASSERT
      const error = await orchestrator
        .findAndCount(rootRepo, {
          order: [{ field: 'priority', order: 'DESC', relation: 'relations' }],
          join: [{ relation: 'relations' }],
          take: 10,
          skip: 0,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FederationException);
      expect(error.message).toContain('distinctFilter');
      expect(error.message).toContain('relations');
    });
  });

  describe('Mixed filter scenarios', () => {
    it('should throw error when root filters exist but no distinctFilter on sorted relation', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
        // No distinctFilter
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT & ASSERT — Root filter + relation sort without distinctFilter
      const error = await orchestrator
        .findAndCount(rootRepo, {
          where: {
            field: 'name',
            operator: WhereOperator.CONTAINS,
            value: 'Project',
          },
          order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
          join: [{ relation: 'relations' }],
          take: 10,
          skip: 0,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FederationException);
      expect(error.message).toContain('distinctFilter');
    });
  });

  describe('Valid configurations (should not throw)', () => {
    it('should not throw error when distinctFilter is configured', async () => {
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

      // Mock empty responses
      peerRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT - Should not throw
      const [result] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Validation passed, relation handler called
      expect(result).toEqual([]);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(0);
    });

    it('should not throw error when distinctFilter is configured with additional filters', async () => {
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

      // Mock empty responses
      peerRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT - Should not throw
      const [result] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'active',
          relation: 'relations',
        },
        order: [{ field: 'priority', order: 'DESC', relation: 'relations' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Validation passed
      expect(result).toEqual([]);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);
    });
  });
});
