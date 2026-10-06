/**
 * Integration tests for one-to-one forward relationship enrichment.
 *
 * One-to-one forward: Profile.rootId -> Root.id (non-owning, cardinality 'one')
 *
 * Key behaviors:
 * - Existing relation → single object on root
 * - Missing relation → null on root (not empty array)
 * - Multiple one-to-one relations → each independently enriched
 *
 * Ported from nestjs-crud __tests__/crud-federation/integration/one-to-one-forward.spec.ts
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import {
  type TestRoot,
  type TestProfile,
  type TestSettings,
  createMultiRelationSet,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToOneRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Integration: One-to-One Forward', () => {
  describe('Root with existing related entity', () => {
    it('should populate profile entity object on root (LEFT JOIN)', async () => {
      // ARRANGE
      const relation = mockOneToOneRelation('profile', 'TestProfile', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const profileRepo = mockTestRepo<TestProfile>('TestProfile');
      const { orchestrator } = mockOrchestrator({ TestProfile: profileRepo });

      const data = createMultiRelationSet();

      rootRepo.findAndCount.mockResolvedValue([data.roots, 2]);
      profileRepo.findAndCount.mockResolvedValue([data.profiles, 1]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - ROOT_FIRST strategy
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(profileRepo.findAndCount).toHaveBeenCalledTimes(1);

      expect(rootRepo.findAndCount.mock.invocationCallOrder[0]).toBeLessThan(
        profileRepo.findAndCount.mock.invocationCallOrder[0],
      );

      // Result verification
      expect(total).toBe(2);
      expect(result).toHaveLength(2);

      // Root 1: has profile → single object
      expect(result[0].profile).toEqual({
        id: 1,
        rootId: 1,
        bio: 'Profile 1',
        avatar: 'avatar1.jpg',
      });

      // Root 2: no profile → null (not empty array)
      expect(result[1].profile).toBeNull();
    });
  });

  describe('Root with missing related entity', () => {
    it('should set null profile on root when no profile exists (LEFT JOIN)', async () => {
      // ARRANGE
      const relation = mockOneToOneRelation('profile', 'TestProfile', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const profileRepo = mockTestRepo<TestProfile>('TestProfile');
      const { orchestrator } = mockOrchestrator({ TestProfile: profileRepo });

      const data = createMultiRelationSet();

      rootRepo.findAndCount.mockResolvedValue([data.roots, 2]);
      // No profiles at all
      profileRepo.findAndCount.mockResolvedValue([[], 0]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }],
        take: 10,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(2);
      expect(result).toHaveLength(2);

      // All roots get null profile (LEFT JOIN keeps roots)
      expect(result[0].profile).toBeNull();
      expect(result[1].profile).toBeNull();
    });
  });

  describe('Root with multiple one-to-one relationships', () => {
    it('should handle multiple one-to-one forward relationships correctly', async () => {
      // ARRANGE
      const profileRelation = mockOneToOneRelation('profile', 'TestProfile', {
        on: { from: 'id', to: 'rootId' },
      });
      const settingsRelation = mockOneToOneRelation(
        'settings',
        'TestSettings',
        {
          on: { from: 'id', to: 'rootId' },
        },
      );
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [profileRelation, settingsRelation],
      });
      const profileRepo = mockTestRepo<TestProfile>('TestProfile');
      const settingsRepo = mockTestRepo<TestSettings>('TestSettings');
      const { orchestrator } = mockOrchestrator({
        TestProfile: profileRepo,
        TestSettings: settingsRepo,
      });

      const roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
        { id: 4, name: 'Root 4' },
        { id: 5, name: 'Root 5' },
      ] as TestRoot[];

      const profiles = [
        { id: 1, rootId: 1, bio: 'Profile 1', avatar: 'avatar1.jpg' },
        { id: 2, rootId: 3, bio: 'Profile for Root 3' },
        { id: 3, rootId: 4, bio: 'Profile for Root 4', avatar: 'avatar4.jpg' },
        // Roots 2 and 5 have no profiles
      ] as TestProfile[];

      const settings = [
        { id: 1, rootId: 1, theme: 'dark', notifications: true },
        { id: 2, rootId: 2, theme: 'light', notifications: false },
        { id: 3, rootId: 5, theme: 'auto', notifications: true },
        // Roots 3 and 4 have no settings
      ] as TestSettings[];

      rootRepo.findAndCount.mockResolvedValue([roots, 5]);
      profileRepo.findAndCount.mockResolvedValue([profiles, 3]);
      settingsRepo.findAndCount.mockResolvedValue([settings, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }, { relation: 'settings' }],
        take: 10,
        skip: 0,
      });

      // ASSERT - ROOT_FIRST, all 3 repos called
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(profileRepo.findAndCount).toHaveBeenCalledTimes(1);
      expect(settingsRepo.findAndCount).toHaveBeenCalledTimes(1);

      expect(total).toBe(5);
      expect(result).toHaveLength(5);

      // Profile enrichment (one-to-one: object or null)
      expect(result[0].profile).toEqual({
        id: 1,
        rootId: 1,
        bio: 'Profile 1',
        avatar: 'avatar1.jpg',
      });
      expect(result[1].profile).toBeNull();
      expect(result[2].profile).toEqual({
        id: 2,
        rootId: 3,
        bio: 'Profile for Root 3',
      });
      expect(result[3].profile).toEqual({
        id: 3,
        rootId: 4,
        bio: 'Profile for Root 4',
        avatar: 'avatar4.jpg',
      });
      expect(result[4].profile).toBeNull();

      // Settings enrichment (one-to-one: object or null)
      expect(result[0].settings).toEqual({
        id: 1,
        rootId: 1,
        theme: 'dark',
        notifications: true,
      });
      expect(result[1].settings).toEqual({
        id: 2,
        rootId: 2,
        theme: 'light',
        notifications: false,
      });
      expect(result[2].settings).toBeNull();
      expect(result[3].settings).toBeNull();
      expect(result[4].settings).toEqual({
        id: 3,
        rootId: 5,
        theme: 'auto',
        notifications: true,
      });
    });
  });

  describe('Pagination handling', () => {
    it('should correctly enrich one-to-one relations with pagination', async () => {
      // ARRANGE
      const relation = mockOneToOneRelation('profile', 'TestProfile', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const profileRepo = mockTestRepo<TestProfile>('TestProfile');
      const { orchestrator } = mockOrchestrator({ TestProfile: profileRepo });

      // Page 1: roots 1-5
      const page1Roots = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Root 2' },
        { id: 3, name: 'Root 3' },
        { id: 4, name: 'Root 4' },
        { id: 5, name: 'Root 5' },
      ] as TestRoot[];

      const page1Profiles = [
        { id: 1, rootId: 1, bio: 'Profile for Root 1', avatar: 'avatar1.jpg' },
        { id: 2, rootId: 3, bio: 'Profile for Root 3' },
        { id: 3, rootId: 5, bio: 'Profile for Root 5', avatar: 'avatar5.jpg' },
        // Roots 2 and 4 have no profiles
      ] as TestProfile[];

      rootRepo.findAndCount.mockResolvedValue([page1Roots, 10]);
      profileRepo.findAndCount.mockResolvedValue([page1Profiles, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }],
        take: 5,
        skip: 0,
      });

      // ASSERT
      expect(total).toBe(10);
      expect(result).toHaveLength(5);

      // Verify profile hydration constraint
      const profileCall = profileRepo.findAndCount.mock.calls[0][0];
      expect(profileCall?.where).toEqual({
        field: 'rootId',
        operator: WhereOperator.IN,
        value: [1, 2, 3, 4, 5],
      });

      // Enrichment
      expect(result[0].profile).toEqual(page1Profiles[0]);
      expect(result[1].profile).toBeNull();
      expect(result[2].profile).toEqual(page1Profiles[1]);
      expect(result[3].profile).toBeNull();
      expect(result[4].profile).toEqual(page1Profiles[2]);
    });

    it('should correctly enrich one-to-one relations for page 2', async () => {
      // ARRANGE
      const relation = mockOneToOneRelation('profile', 'TestProfile', {
        on: { from: 'id', to: 'rootId' },
      });
      const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
        relations: [relation],
      });
      const profileRepo = mockTestRepo<TestProfile>('TestProfile');
      const { orchestrator } = mockOrchestrator({ TestProfile: profileRepo });

      // Page 2: roots 6-10
      const page2Roots = [
        { id: 6, name: 'Root 6' },
        { id: 7, name: 'Root 7' },
        { id: 8, name: 'Root 8' },
        { id: 9, name: 'Root 9' },
        { id: 10, name: 'Root 10' },
      ] as TestRoot[];

      const page2Profiles = [
        { id: 4, rootId: 6, bio: 'Profile for Root 6' },
        { id: 5, rootId: 8, bio: 'Profile for Root 8', avatar: 'avatar8.jpg' },
        {
          id: 6,
          rootId: 10,
          bio: 'Profile for Root 10',
          avatar: 'avatar10.jpg',
        },
      ] as TestProfile[];

      rootRepo.findAndCount.mockResolvedValue([page2Roots, 10]);
      profileRepo.findAndCount.mockResolvedValue([page2Profiles, 3]);

      // ACT
      const [result, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }],
        take: 5,
        skip: 5,
      });

      // ASSERT
      expect(total).toBe(10);
      expect(result).toHaveLength(5);

      // Enrichment for page 2
      expect(result[0].profile).toEqual(page2Profiles[0]);
      expect(result[1].profile).toBeNull();
      expect(result[2].profile).toEqual(page2Profiles[1]);
      expect(result[3].profile).toBeNull();
      expect(result[4].profile).toEqual(page2Profiles[2]);
    });
  });
});
