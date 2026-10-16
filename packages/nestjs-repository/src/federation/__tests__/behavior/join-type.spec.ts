/**
 * Tests for join behavior for forward relations.
 *
 * A join alone uses the ROOT_FIRST strategy and returns every root,
 * including those without matching relations. Narrowing to roots with a
 * related row is a relation filter (see inner-join-behavior.spec.ts).
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/join-type.spec.ts
 */
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

describe('FederationOrchestrator - Join (Forward Relations)', () => {
  describe('Forward relationships (one-to-many)', () => {
    it('should return every root, including those without relations', async () => {
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

      // All 3 roots returned
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
      // Root 3: no relations (the join keeps it)
      expect(result[2].relations).toEqual([]);
    });
  });
});
