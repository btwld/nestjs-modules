/**
 * Integration tests for one-to-many forward relationship enrichment.
 *
 * One-to-many forward: Relation.rootId -> Root.id (non-owning, cardinality 'many')
 *
 * Key behaviors:
 * - Existing relations → array on root
 * - Missing relations → empty array on root (LEFT JOIN)
 * - Multiple roots with varying relation counts
 * - Multiple one-to-many relation types on same root
 *
 * Ported from nestjs-crud __tests__/crud-federation/integration/one-to-many-forward.spec.ts
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import {
  type TestRoot,
  type TestRelation,
  type TestSettings,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Integration: One-to-Many Forward', () => {
  describe('Handler call sequencing', () => {
    it('should call root first then relation (ROOT_FIRST / LEFT JOIN)', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
        { id: 4, name: 'Root 4' },
        { id: 5, name: 'Root 5' },
      ] as TestRoot[];

      const relations = [
        { id: 1, rootId: 1, title: 'Relation 1' },
        { id: 2, rootId: 2, title: 'Relation 2' },
        { id: 3, rootId: 3, title: 'Relation 3' },
        { id: 4, rootId: 99, title: 'Orphan Relation' },
      ] as TestRelation[];

      rootRepo.findAndCount.mockResolvedValue([roots, 5]);
      peerRepo.findAndCount.mockResolvedValue([relations, 4]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - ROOT_FIRST
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        peerRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Relation handler called with root IDs
      const peerCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(peerCall?.where).toEqual({
        field: 'rootId',
        operator: WhereOperator.IN,
        value: [1, 2, 3, 4, 5],
      });

      // All roots returned
      expect(total).toBe(5);
      expect(result).toHaveLength(5);

      // Enrichment: roots with matching relations get arrays, others get []
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1' },
      ]);
      expect(result[1].relations).toEqual([
        { id: 2, rootId: 2, title: 'Relation 2' },
      ]);
      expect(result[2].relations).toEqual([
        { id: 3, rootId: 3, title: 'Relation 3' },
      ]);
      expect(result[3].relations).toEqual([]); // Root 4: no relations
      expect(result[4].relations).toEqual([]); // Root 5: no relations
      // Orphan relation (rootId: 99) correctly not attached
    });

    it('should set empty arrays when no relations exist (LEFT JOIN)', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
      ] as TestRoot[];

      rootRepo.findAndCount.mockResolvedValue([roots, 2]);
      peerRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - All roots returned with empty relation arrays
      expect(total).toBe(2);
      expect(result).toHaveLength(2);
      expect(result[0].relations).toEqual([]);
      expect(result[1].relations).toEqual([]);
    });
  });

  describe('Data patterns', () => {
    it('should handle roots with varying relation counts', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
        { id: 4, name: 'Root 4' },
      ] as TestRoot[];

      const relations = [
        { id: 1, rootId: 1, title: 'Relation 1A' },
        { id: 2, rootId: 1, title: 'Relation 1B' },
        { id: 3, rootId: 1, title: 'Relation 1C' },
        { id: 4, rootId: 2, title: 'Relation 2A' },
        // Root 3: no relations
        { id: 5, rootId: 4, title: 'Relation 4A' },
        { id: 6, rootId: 4, title: 'Relation 4B' },
      ] as TestRelation[];

      rootRepo.findAndCount.mockResolvedValue([roots, 4]);
      peerRepo.findAndCount.mockResolvedValue([relations, 6]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(4);
      expect(result).toHaveLength(4);

      // Root 1: 3 relations
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1A' },
        { id: 2, rootId: 1, title: 'Relation 1B' },
        { id: 3, rootId: 1, title: 'Relation 1C' },
      ]);
      // Root 2: 1 relation
      expect(result[1].relations).toEqual([
        { id: 4, rootId: 2, title: 'Relation 2A' },
      ]);
      // Root 3: 0 relations
      expect(result[2].relations).toEqual([]);
      // Root 4: 2 relations
      expect(result[3].relations).toEqual([
        { id: 5, rootId: 4, title: 'Relation 4A' },
        { id: 6, rootId: 4, title: 'Relation 4B' },
      ]);
    });

    it('should handle single root with multiple relations', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const roots = [{ id: 1, name: 'Only Root' }] as TestRoot[];
      const relations = [
        { id: 1, rootId: 1, title: 'Relation 1' },
        { id: 2, rootId: 1, title: 'Relation 2' },
      ] as TestRelation[];

      rootRepo.findAndCount.mockResolvedValue([roots, 1]);
      peerRepo.findAndCount.mockResolvedValue([relations, 2]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - Single root ID → EQ constraint (not IN)
      const peerCall = peerRepo.findAndCount.mock.calls[0][0];
      expect(peerCall?.where).toEqual({
        field: 'rootId',
        operator: WhereOperator.EQ,
        value: 1,
      });

      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].relations).toEqual(relations);
    });
  });

  describe('Multiple relation types', () => {
    it('should handle multiple one-to-many relationships on same root', async () => {
      // ARRANGE
      const relationsRelation = mockOneToManyRelation(
        'relations',
        'TestRelation',
        { on: { from: 'id', to: 'rootId' } },
      );
      const settingsRelation = mockOneToManyRelation(
        'settings',
        'TestSettings',
        { on: { from: 'id', to: 'rootId' } },
      );

      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relationsRelation, settingsRelation],
      });
      const relationRepo = mockTestRepo<TestRelation>('TestRelation');
      const settingsRepo = mockTestRepo<TestSettings>('TestSettings');
      const { orchestrator } = mockOrchestrator({
        TestRelation: relationRepo,
        TestSettings: settingsRepo,
      });

      const roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
      ] as TestRoot[];

      const relations = [
        { id: 1, rootId: 1, title: 'Relation 1A' },
        { id: 2, rootId: 1, title: 'Relation 1B' },
        { id: 3, rootId: 2, title: 'Relation 2A' },
        // Root 3: no relations
      ] as TestRelation[];

      const settings = [
        { id: 1, rootId: 1, theme: 'dark', notifications: true },
        // Root 2: no settings
        { id: 2, rootId: 3, theme: 'auto', notifications: true },
      ] as TestSettings[];

      rootRepo.findAndCount.mockResolvedValue([roots, 3]);
      relationRepo.findAndCount.mockResolvedValue([relations, 3]);
      settingsRepo.findAndCount.mockResolvedValue([settings, 2]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }, { relation: 'settings' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(relationRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(settingsRepo.findAndCount).toHaveBeenCalledTimes(1);

      expect(total).toBe(3);
      expect(result).toHaveLength(3);

      // Every root has both relation properties
      for (const root of result) {
        expect(root).toHaveProperty('relations');
        expect(Array.isArray(root.relations)).toBe(true);
        expect(root).toHaveProperty('settings');
        expect(Array.isArray(root.settings)).toBe(true);
      }

      // Relation enrichment
      expect(result[0].relations).toEqual([
        { id: 1, rootId: 1, title: 'Relation 1A' },
        { id: 2, rootId: 1, title: 'Relation 1B' },
      ]);
      expect(result[1].relations).toEqual([
        { id: 3, rootId: 2, title: 'Relation 2A' },
      ]);
      expect(result[2].relations).toEqual([]);

      // Settings enrichment
      expect(result[0].settings).toEqual([
        { id: 1, rootId: 1, theme: 'dark', notifications: true },
      ]);
      expect(result[1].settings).toEqual([]);
      expect(result[2].settings).toEqual([
        { id: 2, rootId: 3, theme: 'auto', notifications: true },
      ]);
    });
  });

  describe('Pagination', () => {
    it('should correctly enrich relations for paginated results', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // Page 2: roots 6-10
      const page2Roots = [
        { id: 6, name: 'Root 6' },
        { id: 7, name: 'Root 7' },
        { id: 8, name: 'Root 8' },
        { id: 9, name: 'Root 9' },
        { id: 10, name: 'Root 10' },
      ] as TestRoot[];

      const page2Relations = [
        { id: 11, rootId: 6, title: 'Relation 6A' },
        { id: 12, rootId: 6, title: 'Relation 6B' },
        { id: 13, rootId: 7, title: 'Relation 7A' },
        { id: 14, rootId: 8, title: 'Relation 8A' },
        { id: 15, rootId: 8, title: 'Relation 8B' },
        { id: 16, rootId: 8, title: 'Relation 8C' },
        // Roots 9 and 10: no relations
      ] as TestRelation[];

      rootRepo.findAndCount.mockResolvedValue([page2Roots, 10]);
      peerRepo.findAndCount.mockResolvedValue([page2Relations, 6]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 5,
      });

      // ASSERT
      expect(total).toBe(10);
      expect(result).toHaveLength(5);

      // Root pagination passed through
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.take).toBe(5);
      expect(rootCall?.skip).toBe(5);

      // Enrichment for page 2
      expect(result[0].relations).toEqual([
        { id: 11, rootId: 6, title: 'Relation 6A' },
        { id: 12, rootId: 6, title: 'Relation 6B' },
      ]);
      expect(result[1].relations).toEqual([
        { id: 13, rootId: 7, title: 'Relation 7A' },
      ]);
      expect(result[2].relations).toEqual([
        { id: 14, rootId: 8, title: 'Relation 8A' },
        { id: 15, rootId: 8, title: 'Relation 8B' },
        { id: 16, rootId: 8, title: 'Relation 8C' },
      ]);
      expect(result[3].relations).toEqual([]);
      expect(result[4].relations).toEqual([]);
    });

    it('should handle empty page gracefully', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      // Beyond available data
      rootRepo.findAndCount.mockResolvedValue([[], 10]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 10,
      });

      // ASSERT - Empty result, no peer call
      expect(total).toBe(10);
      expect(result).toEqual([]);
      expect(peerRepo.findAndCount).toHaveBeenCalledTimes(0);
    });

    it('should handle partial last page', async () => {
      // ARRANGE
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const peerRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

      const lastPageRoots = [
        { id: 11, name: 'Root 11' },
        { id: 12, name: 'Root 12' },
      ] as TestRoot[];

      const lastPageRelations = [
        { id: 11, rootId: 11, title: 'Relation 11A' },
        { id: 12, rootId: 12, title: 'Relation 12A' },
        { id: 13, rootId: 12, title: 'Relation 12B' },
      ] as TestRelation[];

      rootRepo.findAndCount.mockResolvedValue([lastPageRoots, 12]);
      peerRepo.findAndCount.mockResolvedValue([lastPageRelations, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 5,
        skip: 10,
      });

      // ASSERT
      expect(total).toBe(12);
      expect(result).toHaveLength(2);

      expect(result[0].relations).toEqual([
        { id: 11, rootId: 11, title: 'Relation 11A' },
      ]);
      expect(result[1].relations).toEqual([
        { id: 12, rootId: 12, title: 'Relation 12A' },
        { id: 13, rootId: 12, title: 'Relation 12B' },
      ]);
    });
  });
});
