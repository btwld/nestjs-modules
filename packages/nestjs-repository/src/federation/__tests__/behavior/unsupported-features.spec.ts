/**
 * Validation tests for unsupported federation features.
 *
 * Tests that OR compounds containing relation-tagged conditions
 * are rejected with a clear error message.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/unsupported-features.spec.ts
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
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Unsupported Features Validation', () => {
  describe('OR filter validation', () => {
    it('should throw error when OR compound contains relation-tagged condition', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT & ASSERT
      await expect(
        orchestrator.findAndCount(rootRepo, {
          where: {
            operator: WhereCompoundOperator.OR,
            conditions: [
              {
                field: 'name',
                operator: WhereOperator.CONTAINS,
                value: 'test',
              },
              {
                field: 'status',
                operator: WhereOperator.EQ,
                value: 'active',
                relation: 'relations',
              },
            ],
          },
          join: [{ relation: 'relations' }],
          take: 10,
          skip: 0,
        }),
      ).rejects.toThrow(FederationException);

      expect(rootRepo.findAndCount).not.toHaveBeenCalled();
      expect(peerRepo.findAndCount).not.toHaveBeenCalled();
    });

    it('should throw with descriptive message mentioning the relation name', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // ACT
      const error = await orchestrator
        .findAndCount(rootRepo, {
          where: {
            operator: WhereCompoundOperator.OR,
            conditions: [
              {
                field: 'title',
                operator: WhereOperator.CONTAINS,
                value: 'test',
                relation: 'relations',
              },
            ],
          },
          join: [{ relation: 'relations' }],
          take: 10,
          skip: 0,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FederationException);
      expect(error.message).toContain('OR');
      expect(error.message).toContain('relations');
    });

    it('should not throw error when AND compound is used normally', async () => {
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

      peerRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT - AND compound with relation filter: should work fine
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          operator: WhereCompoundOperator.AND,
          conditions: [
            {
              field: 'status',
              operator: WhereOperator.EQ,
              value: 'active',
              relation: 'relations',
            },
          ],
        },
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - No error
      expect(result).toEqual([]);
      expect(total).toBe(0);
    });
  });
});
