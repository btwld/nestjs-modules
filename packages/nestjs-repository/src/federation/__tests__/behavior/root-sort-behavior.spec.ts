/**
 * Behavior tests for root sort strategy (LEFT JOIN compatible).
 *
 * Root sort allows LEFT JOIN behavior — all roots returned, sorted by root field.
 * No constraint validation needed for root sorts.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/root-sort-behavior.spec.ts
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import {
  type TestRoot,
  type TestRelation,
  createNameSortDataSet,
  createIdDescSortDataSet,
  createMultiSortDataSet,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Root Sort Strategy', () => {
  describe('Single root field sort', () => {
    it('should sort roots by name with LEFT JOIN behavior', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createNameSortDataSet();

      rootRepo.findAndCount.mockResolvedValue([data.roots, 3]);
      peerRepo.findAndCount.mockResolvedValue([data.relations, 2]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'name', order: 'ASC' }],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Handler call verification
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Root called first (ROOT_FIRST strategy)
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        peerRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Root query: LEFT JOIN = no filter constraints, just sort
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toBeUndefined();
      expect(rootCall?.order).toEqual([{ field: 'name', order: 'ASC' }]);
      expect(rootCall?.take).toBe(10);
      expect(rootCall?.skip).toBe(0);

      // ASSERT - Result verification
      expect(total).toBe(3);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 3, 2]); // Root A, Root B, Root C

      // Verify enrichment
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1' },
      ]);
      expect(result[1].relations).toEqual([
        { id: 2, rootId: 3, title: 'Relation 2' },
      ]);
      expect(result[2].relations).toEqual([]); // Root 2 has no relations
    });

    it('should sort roots by id descending with LEFT JOIN behavior', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createIdDescSortDataSet();

      rootRepo.findAndCount.mockResolvedValue([data.roots, 5]);
      peerRepo.findAndCount.mockResolvedValue([data.relations, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'id', order: 'DESC' }],
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 0,
      });

      // ASSERT
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Root called first
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        peerRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Root query: sort by id DESC
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toBeUndefined();
      expect(rootCall?.order).toEqual([{ field: 'id', order: 'DESC' }]);

      // Result verification
      expect(total).toBe(5);
      expect(result).toHaveLength(5);
      expect(result.map((r) => r.id)).toEqual([3, 4, 5, 2, 1]);

      // Enrichment verification
      expect(result[0].relations).toEqual([]); // id:3 no relations
      expect(result[1].relations).toEqual([
        { id: 2, rootId: 4, title: 'Relation 2' },
        { id: 3, rootId: 4, title: 'Relation 3' },
      ]);
      expect(result[2].relations).toEqual([]); // id:5 no relations
      expect(result[3].relations).toEqual([
        { id: 1, rootId: 2, title: 'Relation 1' },
      ]);
      expect(result[4].relations).toEqual([]); // id:1 no relations
    });
  });

  describe('Multiple root field sorts', () => {
    it('should sort roots by multiple fields with LEFT JOIN behavior', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const data = createMultiSortDataSet();

      rootRepo.findAndCount.mockResolvedValue([data.roots, 3]);
      peerRepo.findAndCount.mockResolvedValue([data.relations, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        order: [
          { field: 'name', order: 'ASC' },
          { field: 'id', order: 'DESC' },
        ],
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);

      // Root query: multi-field sort
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toBeUndefined();
      expect(rootCall?.order).toEqual([
        { field: 'name', order: 'ASC' },
        { field: 'id', order: 'DESC' },
      ]);

      // Result verification
      expect(total).toBe(3);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([3, 1, 2]); // Root A(3), Root A(1), Root B(2)

      // Enrichment
      expect(result[0].relations).toEqual([
        { id: 3, rootId: 3, title: 'Relation 3' },
      ]);
      expect(result[1].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1' },
        { id: 2, rootId: 1, title: 'Relation 2' },
      ]);
      expect(result[2].relations).toEqual([]); // Root 2 has no relations
    });
  });

  describe('Root sort with filters', () => {
    it('should apply root filter and sort together', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: peerRepo,
      });

      const filteredRoots = [{ id: 1, name: 'Root A' } as TestRoot];

      rootRepo.findAndCount.mockResolvedValue([filteredRoots, 1]);
      peerRepo.findAndCount.mockResolvedValue([
        [{ id: 1, rootId: 1, title: 'Relation 1' } as TestRelation],
        1,
      ]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        where: { field: 'name', operator: WhereOperator.CONTAINS, value: 'A' },
        order: [{ field: 'name', order: 'ASC' }],
        join: [{ relation: 'relations' }],
        take: 10,
      });

      // ASSERT
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'name',
        operator: WhereOperator.CONTAINS,
        value: 'A',
      });
      expect(rootCall?.order).toEqual([{ field: 'name', order: 'ASC' }]);

      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1' },
      ]);
    });
  });
});
