/**
 * Behavior tests for complex federation scenarios.
 *
 * Tests the buffer strategy with sparse data requiring multiple iterations
 * in the RELATION_FIRST discovery phase.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/complex-scenario.spec.ts
 */
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../../repository/repository.types.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Complex Scenarios', () => {
  describe('Sparse data iteration', () => {
    it('should handle sparse data requiring multiple iterations', async () => {
      // ARRANGE - Each batch of 10 relations yields few unique root IDs
      // This exercises the buffer strategy's iterative discovery
      const relation = mockOneToManyRelation('comments', 'TestRelation', {
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

      // Batch 1: 10 relations, 3 unique roots (479, 67, 89)
      const batch1 = [
        { id: 822, rootId: 479, title: 'Check 1', priority: 11 },
        { id: 823, rootId: 479, title: 'Check 2', priority: 11 },
        { id: 824, rootId: 479, title: 'Check 3', priority: 11 },
        { id: 825, rootId: 479, title: 'Check 4', priority: 11 },
        { id: 112, rootId: 67, title: 'Feature 1', priority: 10 },
        { id: 113, rootId: 67, title: 'Feature 2', priority: 10 },
        { id: 114, rootId: 67, title: 'Feature 3', priority: 10 },
        { id: 203, rootId: 89, title: 'Issue 1', priority: 10 },
        { id: 204, rootId: 89, title: 'Issue 2', priority: 10 },
        { id: 205, rootId: 89, title: 'Issue 3', priority: 10 },
      ] as TestRelation[];

      // Batch 2: 10 relations, 2 new roots (23, 156) — accumulated 5
      const batch2 = [
        { id: 47, rootId: 23, title: 'Fix 1', priority: 10 },
        { id: 48, rootId: 23, title: 'Fix 2', priority: 10 },
        { id: 49, rootId: 23, title: 'Fix 3', priority: 10 },
        { id: 50, rootId: 23, title: 'Fix 4', priority: 10 },
        { id: 51, rootId: 23, title: 'Fix 5', priority: 10 },
        { id: 341, rootId: 156, title: 'Perf 1', priority: 9 },
        { id: 342, rootId: 156, title: 'Perf 2', priority: 9 },
        { id: 343, rootId: 156, title: 'Perf 3', priority: 9 },
        { id: 344, rootId: 156, title: 'Perf 4', priority: 9 },
        { id: 345, rootId: 156, title: 'Perf 5', priority: 9 },
      ] as TestRelation[];

      // Batch 3: 10 relations, 2 new roots (201, 234) — accumulated 7
      const batch3 = [
        { id: 389, rootId: 201, title: 'Patch 1', priority: 9 },
        { id: 390, rootId: 201, title: 'Patch 2', priority: 9 },
        { id: 391, rootId: 201, title: 'Patch 3', priority: 9 },
        { id: 392, rootId: 201, title: 'Patch 4', priority: 9 },
        { id: 393, rootId: 201, title: 'Patch 5', priority: 9 },
        { id: 421, rootId: 234, title: 'UI 1', priority: 9 },
        { id: 422, rootId: 234, title: 'UI 2', priority: 9 },
        { id: 423, rootId: 234, title: 'UI 3', priority: 9 },
        { id: 424, rootId: 234, title: 'UI 4', priority: 9 },
        { id: 425, rootId: 234, title: 'UI 5', priority: 9 },
      ] as TestRelation[];

      // Batch 4: 10 relations, 1 new root (298) — accumulated 8
      const batch4 = [
        { id: 534, rootId: 298, title: 'Doc 1', priority: 8 },
        { id: 535, rootId: 298, title: 'Doc 2', priority: 8 },
        { id: 536, rootId: 298, title: 'Doc 3', priority: 8 },
        { id: 537, rootId: 298, title: 'Doc 4', priority: 8 },
        { id: 538, rootId: 298, title: 'Doc 5', priority: 8 },
        { id: 539, rootId: 298, title: 'Doc 6', priority: 8 },
        { id: 540, rootId: 298, title: 'Doc 7', priority: 8 },
        { id: 541, rootId: 298, title: 'Doc 8', priority: 8 },
        { id: 542, rootId: 298, title: 'Doc 9', priority: 8 },
        { id: 543, rootId: 298, title: 'Doc 10', priority: 8 },
      ] as TestRelation[];

      // Batch 5: 7 relations, 3 new roots (345, 389, 412) — accumulated 11 >= take(10)
      const batch5 = [
        { id: 612, rootId: 345, title: 'API 1', priority: 8 },
        { id: 614, rootId: 345, title: 'API 3', priority: 8 },
        { id: 687, rootId: 389, title: 'DB 1', priority: 8 },
        { id: 688, rootId: 389, title: 'DB 2', priority: 8 },
        { id: 689, rootId: 389, title: 'DB 3', priority: 8 },
        { id: 734, rootId: 412, title: 'Test 1', priority: 8 },
        { id: 735, rootId: 412, title: 'Test 2', priority: 8 },
      ] as TestRelation[];

      const allRelations = [
        ...batch1,
        ...batch2,
        ...batch3,
        ...batch4,
        ...batch5,
      ];

      const totalComments = 500;

      // Discovery batches (5 iterations)
      peerRepo.findAndCount
        .mockResolvedValueOnce([batch1, totalComments])
        .mockResolvedValueOnce([batch2, totalComments])
        .mockResolvedValueOnce([batch3, totalComments])
        .mockResolvedValueOnce([batch4, totalComments])
        .mockResolvedValueOnce([batch5, totalComments])
        // Hydration: all relations for discovered roots
        .mockResolvedValueOnce([allRelations, allRelations.length]);

      // Root fetch: 11 discovered roots, but take=10 slices to 10
      const correspondingRoots = [
        { id: 23, name: 'Root 23' },
        { id: 67, name: 'Root 67' },
        { id: 89, name: 'Root 89' },
        { id: 156, name: 'Root 156' },
        { id: 201, name: 'Root 201' },
        { id: 234, name: 'Root 234' },
        { id: 298, name: 'Root 298' },
        { id: 345, name: 'Root 345' },
        { id: 389, name: 'Root 389' },
        { id: 412, name: 'Root 412' },
        { id: 479, name: 'Root 479' },
      ] as TestRoot[];

      rootRepo.findAndCount.mockResolvedValue([
        correspondingRoots,
        correspondingRoots.length,
      ]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'priority',
          operator: WhereOperator.GTE,
          value: 8,
          relation: 'comments',
        },
        join: [{ relation: 'comments' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Handler call counts
      // 5 discovery + 1 hydration = 6 peer calls
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(6);
      // 1 constrained root fetch
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Discovery offsets advance: 0, 10, 20, 30, 40
      expect(peerRepo.findAndCount.mock.calls[0][0]?.skip).toBe(0);
      expect(peerRepo.findAndCount.mock.calls[1][0]?.skip).toBe(10);
      expect(peerRepo.findAndCount.mock.calls[2][0]?.skip).toBe(20);
      expect(peerRepo.findAndCount.mock.calls[3][0]?.skip).toBe(30);
      expect(peerRepo.findAndCount.mock.calls[4][0]?.skip).toBe(40);

      // Each discovery call has the same filter conditions
      for (let i = 0; i < 5; i++) {
        const call = peerRepo.findAndCount.mock.calls[i][0];
        expect(call?.where).toEqual({
          operator: WhereCompoundOperator.AND,
          conditions: [
            {
              field: 'priority',
              operator: WhereOperator.GTE,
              value: 8,
              relation: 'comments',
            },
            {
              field: 'isLatest',
              operator: WhereOperator.EQ,
              value: true,
              relation: 'comments',
            },
          ],
        });
      }

      // Result: 10 roots (sliced from 11 discovered)
      expect(result).toHaveLength(10);
      expect(total).toBe(500);

      // Every root has comments array
      for (const root of result) {
        expect(root).toHaveProperty('comments');
        expect(Array.isArray(root.comments)).toBe(true);
      }
    });

    it('should stop iterating when a batch is exhausted before reaching take', async () => {
      // ARRANGE - Data runs out before accumulating enough roots
      const relation = mockOneToManyRelation('comments', 'TestRelation', {
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

      // Only 5 matching relations across 3 roots (fewer than take=10)
      const allRelations = [
        { id: 1, rootId: 1, title: 'Task A', priority: 9 },
        { id: 2, rootId: 1, title: 'Task B', priority: 8 },
        { id: 3, rootId: 2, title: 'Task C', priority: 8 },
        { id: 4, rootId: 3, title: 'Task D', priority: 8 },
        { id: 5, rootId: 3, title: 'Task E', priority: 8 },
      ] as TestRelation[];

      // Single discovery batch: 5 < take(10) → exhausted
      peerRepo.findAndCount
        .mockResolvedValueOnce([allRelations, 5])
        // Hydration
        .mockResolvedValueOnce([allRelations, 5]);

      const roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
      ] as TestRoot[];
      rootRepo.findAndCount.mockResolvedValue([roots, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'priority',
          operator: WhereOperator.GTE,
          value: 8,
          relation: 'comments',
        },
        join: [{ relation: 'comments' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      // Only 1 discovery (exhausted) + 1 hydration = 2 peer calls
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(2);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);

      expect(result).toHaveLength(3);
      expect(total).toBe(5);

      // All roots have comments
      for (const root of result) {
        expect(root).toHaveProperty('comments');
        expect(Array.isArray(root.comments)).toBe(true);
      }
    });
  });
});
