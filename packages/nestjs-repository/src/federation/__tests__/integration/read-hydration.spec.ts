/**
 * Integration tests for single-entity read with relation hydration.
 *
 * The CRUD layer's `service.read()` fetches one root and hydrates relations.
 * At the repository level this is equivalent to `findAndCount` returning
 * a single root with join-requested relations hydrated via the orchestrator.
 *
 * Key behaviors:
 * - One-to-one: existing → object, missing → null
 * - One-to-many: existing → array, missing → empty array
 * - Mixed relation types independently enriched
 * - Null foreign key on root → null relation (LEFT JOIN)
 *
 * Ported from nestjs-crud __tests__/crud-federation/integration/read-hydration.spec.ts
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import {
  type TestRoot,
  type TestRelation,
  type TestProfile,
  createSingleEntitySet,
  createMinimalRootRelationSet,
  createMultiRelationSet,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToOneRelation,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Integration: Read Hydration', () => {
  describe('no relations', () => {
    it('should fetch single root without relations', async () => {
      // ARRANGE
      const data = createSingleEntitySet();
      const rootRepo = mockTestRepo<TestRoot>('TestRoot');
      const { orchestrator } = mockOrchestrator({});

      rootRepo.findAndCount.mockResolvedValue([data.roots, 1]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        take: 1,
        skip: 0,
      });

      // ASSERT
      expect(result).toEqual(data.roots);
      expect(total).toBe(1);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('one-to-one forward relation', () => {
    it('should hydrate existing one-to-one relation', async () => {
      // ARRANGE
      const data = createMinimalRootRelationSet();
      const relation = mockOneToOneRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const relationRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: relationRepo,
      });

      // Single root
      rootRepo.findAndCount.mockResolvedValue([[data.roots[0]], 1]);
      // Relation exists for root 1
      relationRepo.findAndCount.mockResolvedValue([[data.relations[0]], 1]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 1,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);

      // Handler call verification
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(relationRepo.findAndCount).toHaveBeenCalledTimes(1);

      // ROOT_FIRST: root called before relation
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        relationRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Verify relation service was called with correct filter
      // buildConstraint uses EQ (not IN) for single-value constraints
      const relationCall = relationRepo.findAndCount.mock.calls[0][0];
      expect(relationCall?.where).toEqual({
        field: 'rootId',
        operator: WhereOperator.EQ,
        value: 1,
      });

      // Verify enrichment - one-to-one → single object
      expect(result[0].relations).toEqual(data.relations[0]);
    });

    it('should handle missing one-to-one relation', async () => {
      // ARRANGE
      const data = createSingleEntitySet();
      const relation = mockOneToOneRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const relationRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: relationRepo,
      });

      rootRepo.findAndCount.mockResolvedValue([data.roots, 1]);
      // No relations found
      relationRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 1,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);

      // Handler call verification
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(relationRepo.findAndCount).toHaveBeenCalledTimes(1);

      // ROOT_FIRST: root called before relation
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        relationRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Verify relation service was called with correct filter
      // buildConstraint uses EQ (not IN) for single-value constraints
      const relationCall = relationRepo.findAndCount.mock.calls[0][0];
      expect(relationCall?.where).toEqual({
        field: 'rootId',
        operator: WhereOperator.EQ,
        value: 1,
      });

      // Verify enrichment - one-to-one missing → null
      expect(result[0].relations).toBeNull();
    });
  });

  describe('one-to-many forward relation', () => {
    it('should hydrate multiple one-to-many relations', async () => {
      // ARRANGE
      const data = createMultiRelationSet();
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const relationRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: relationRepo,
      });

      // Single root
      rootRepo.findAndCount.mockResolvedValue([[data.roots[0]], 1]);
      // Multiple relations for root 1
      const multipleRelations = [
        { id: 1, rootId: 1, title: 'Relation 1' },
        { id: 2, rootId: 1, title: 'Relation 2' },
      ] as TestRelation[];
      relationRepo.findAndCount.mockResolvedValue([multipleRelations, 2]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 1,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);

      // Handler call verification
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(relationRepo.findAndCount).toHaveBeenCalledTimes(1);

      // ROOT_FIRST: root called before relation
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        relationRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Verify relation service was called with correct filter
      // buildConstraint uses EQ (not IN) for single-value constraints
      const relationCall = relationRepo.findAndCount.mock.calls[0][0];
      expect(relationCall?.where).toEqual({
        field: 'rootId',
        operator: WhereOperator.EQ,
        value: 1,
      });

      // Verify enrichment - one-to-many → array
      expect(result[0].relations).toEqual(multipleRelations);
    });

    it('should handle empty one-to-many relation', async () => {
      // ARRANGE
      const data = createSingleEntitySet();
      const relation = mockOneToManyRelation('relations', 'TestRelation', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const relationRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestRelation: relationRepo,
      });

      rootRepo.findAndCount.mockResolvedValue([data.roots, 1]);
      // No relations found
      relationRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'relations' }],
        take: 1,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);

      // Handler call verification
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(relationRepo.findAndCount).toHaveBeenCalledTimes(1);

      // ROOT_FIRST: root called before relation
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        relationRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Verify relation service was called with correct filter
      // buildConstraint uses EQ (not IN) for single-value constraints
      const relationCall = relationRepo.findAndCount.mock.calls[0][0];
      expect(relationCall?.where).toEqual({
        field: 'rootId',
        operator: WhereOperator.EQ,
        value: 1,
      });

      // Verify enrichment - one-to-many empty → empty array
      expect(result[0].relations).toEqual([]);
    });
  });

  describe('mixed relation types', () => {
    it('should hydrate both one-to-one and one-to-many relations', async () => {
      // ARRANGE
      const data = createMultiRelationSet();
      const profileRelation = mockOneToOneRelation('profile', 'TestProfile', {
        on: { from: 'id', to: 'rootId' },
      });
      const relationRelation = mockOneToManyRelation(
        'relations',
        'TestRelation',
        {
          on: { from: 'id', to: 'rootId' },
        },
      );
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [profileRelation, relationRelation],
      });
      const profileRepo = mockTestRepo<TestProfile>('TestProfile');
      const relationRepo = mockTestRepo<TestRelation>('TestRelation');
      const { orchestrator } = mockOrchestrator({
        TestProfile: profileRepo,
        TestRelation: relationRepo,
      });

      // Single root
      rootRepo.findAndCount.mockResolvedValue([[data.roots[0]], 1]);

      // Profile exists for root 1 (one-to-one)
      profileRepo.findAndCount.mockResolvedValue([[data.profiles[0]], 1]);

      // Multiple relations for root 1 (one-to-many)
      const multipleRelations = [
        { id: 1, rootId: 1, title: 'Relation 1' },
        { id: 2, rootId: 1, title: 'Relation 2' },
      ] as TestRelation[];
      relationRepo.findAndCount.mockResolvedValue([multipleRelations, 2]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }, { relation: 'relations' }],
        take: 1,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);

      // Handler call verification
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(profileRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(relationRepo.findAndCount).toHaveBeenCalledTimes(1);

      // ROOT_FIRST: root called before both relations
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        profileRepo.findAndCount.mock.invocationCallOrder[0],
      );
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        relationRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Verify enrichment - both relations properly attached
      expect(result[0].profile).toEqual(data.profiles[0]);
      expect(result[0].relations).toEqual(multipleRelations);
    });
  });

  describe('null foreign key handling', () => {
    it('should handle null foreign key in forward relationship', async () => {
      // ARRANGE
      const rootWithNullForeignKey = {
        id: 1,
        name: 'Only Root',
        profileId: null,
      } as TestRoot;

      const relation = mockOneToOneRelation('profile', 'TestProfile', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const profileRepo = mockTestRepo<TestProfile>('TestProfile');
      const { orchestrator } = mockOrchestrator({
        TestProfile: profileRepo,
      });

      rootRepo.findAndCount.mockResolvedValue([[rootWithNullForeignKey], 1]);
      // No profiles found
      profileRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }],
        take: 1,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);

      // Handler call verification
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(profileRepo.findAndCount).toHaveBeenCalledTimes(1);

      // ROOT_FIRST: root called before profile
      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        profileRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Verify enrichment - profile should be null for null foreign key
      expect(result[0].profile).toBeNull();
    });
  });
});
