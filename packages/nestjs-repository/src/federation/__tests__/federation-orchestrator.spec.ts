import { WhereOperator } from '../../repository/repository.types.js';
import { Where } from '../../repository/where.helpers.js';
import { FederationException } from '../exceptions/federation.exception.js';

import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
  mockOneToOneRelation,
  mockOwningOneToOneRelation,
  mockContext,
  type TestRoot,
  type TestRelation,
  type TestProfile,
} from './fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator', () => {
  // ═════════════════════════════════════════════════════════════════════
  // No relations (passthrough)
  // ═════════════════════════════════════════════════════════════════════

  describe('no federated relations', () => {
    it('should delegate to root repo when no joins are provided', async () => {
      const rootRepo = mockTestRepo<TestRoot>('UserEntity');
      const { orchestrator } = mockOrchestrator({});

      const expected: [TestRoot[], number] = [[{ id: 1, name: 'Alice' }], 1];
      rootRepo.findAndCount.mockResolvedValue(expected);

      const result = await orchestrator.findAndCount(rootRepo, {
        where: { field: 'name', operator: WhereOperator.EQ, value: 'Alice' },
      });

      expect(result).toEqual(expected);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    });

    it('should delegate when joins exist but none are federated', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        federated: false,
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const { orchestrator } = mockOrchestrator({});

      const expected: [TestRoot[], number] = [[{ id: 1, name: 'Alice' }], 1];
      rootRepo.findAndCount.mockResolvedValue(expected);

      const result = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
      });

      expect(result).toEqual(expected);
      expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    });

    it('should delegate when no join matches a federated relation', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const { orchestrator } = mockOrchestrator({});

      const expected: [TestRoot[], number] = [[{ id: 1, name: 'Alice' }], 1];
      rootRepo.findAndCount.mockResolvedValue(expected);

      // Join references a different relation than the federated one
      const result = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'comments' }],
      });

      expect(result).toEqual(expected);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // ROOT_FIRST strategy
  // ═════════════════════════════════════════════════════════════════════

  describe('ROOT_FIRST strategy', () => {
    it('should fetch roots first then hydrate one-to-many relation', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([
        [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        2,
      ]);
      postRepo.findAndCount.mockResolvedValue([
        [
          { id: 10, userId: 1, title: 'Post A' },
          { id: 11, userId: 1, title: 'Post B' },
          { id: 12, userId: 2, title: 'Post C' },
        ],
        3,
      ]);

      const [data, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
      });

      expect(total).toBe(2);
      expect(data).toHaveLength(2);
      expect(data[0].posts).toEqual([
        { id: 10, userId: 1, title: 'Post A' },
        { id: 11, userId: 1, title: 'Post B' },
      ]);
      expect(data[1].posts).toEqual([{ id: 12, userId: 2, title: 'Post C' }]);
    });

    it('should hydrate one-to-one non-owning relation', async () => {
      const profileRelation = mockOneToOneRelation('profile', 'ProfileEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [profileRelation],
      });
      const profileRepo = mockTestRepo<TestProfile>('ProfileEntity');
      const { orchestrator } = mockOrchestrator({
        ProfileEntity: profileRepo,
      });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      profileRepo.findAndCount.mockResolvedValue([
        [{ id: 5, userId: 1, bio: 'Hello' }],
        1,
      ]);

      const [data] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }],
      });

      expect(data[0].profile).toEqual({ id: 5, userId: 1, bio: 'Hello' });
    });

    it('should hydrate owning one-to-one relation via root FK', async () => {
      const blogRelation = mockOwningOneToOneRelation(
        'blog',
        'BlogEntity',
        'blogId',
      );
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [blogRelation],
      });
      const blogRepo = mockTestRepo('BlogEntity');
      const { orchestrator } = mockOrchestrator({ BlogEntity: blogRepo });

      rootRepo.findAndCount.mockResolvedValue([
        [{ id: 1, name: 'Alice', blogId: 100 }],
        1,
      ]);
      blogRepo.findAndCount.mockResolvedValue([
        [{ id: 100, title: 'My Blog' }],
        1,
      ]);

      const [data] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'blog' }],
      });

      expect(data[0].blog).toEqual({ id: 100, title: 'My Blog' });
    });

    it('should set null for one-cardinality with no match', async () => {
      const profileRelation = mockOneToOneRelation('profile', 'ProfileEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [profileRelation],
      });
      const profileRepo = mockTestRepo<TestProfile>('ProfileEntity');
      const { orchestrator } = mockOrchestrator({
        ProfileEntity: profileRepo,
      });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      profileRepo.findAndCount.mockResolvedValue([[], 0]);

      const [data] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'profile' }],
      });

      expect(data[0].profile).toBeNull();
    });

    it('should set empty array for many-cardinality with no matches', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      postRepo.findAndCount.mockResolvedValue([[], 0]);

      const [data] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
      });

      expect(data[0].posts).toEqual([]);
    });

    it('should return empty when root query returns no results', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([[], 0]);

      const [data, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
      });

      expect(data).toEqual([]);
      expect(total).toBe(0);
      expect(postRepo.findAndCount).not.toHaveBeenCalled();
    });

    it('should hydrate multiple relations in parallel', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const profileRelation = mockOneToOneRelation('profile', 'ProfileEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation, profileRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const profileRepo = mockTestRepo<TestProfile>('ProfileEntity');
      const { orchestrator } = mockOrchestrator({
        PostEntity: postRepo,
        ProfileEntity: profileRepo,
      });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      postRepo.findAndCount.mockResolvedValue([
        [{ id: 10, userId: 1, title: 'Post' }],
        1,
      ]);
      profileRepo.findAndCount.mockResolvedValue([
        [{ id: 5, userId: 1, bio: 'Hello' }],
        1,
      ]);

      const [data] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }, { relation: 'profile' }],
      });

      expect(data[0].posts).toEqual([{ id: 10, userId: 1, title: 'Post' }]);
      expect(data[0].profile).toEqual({ id: 5, userId: 1, bio: 'Hello' });
    });

    it('should pass root-only where and order, stripping federated joins', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      postRepo.findAndCount.mockResolvedValue([
        [{ id: 10, userId: 1, title: 'Post' }],
        1,
      ]);

      await orchestrator.findAndCount(rootRepo, {
        where: { field: 'name', operator: WhereOperator.EQ, value: 'Alice' },
        order: [{ field: 'createdAt', order: 'DESC' }],
        join: [{ relation: 'posts' }],
        take: 5,
        skip: 0,
      });

      // Root query should have root-only conditions and no federated joins
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'Alice',
      });
      expect(rootCall?.order).toEqual([{ field: 'createdAt', order: 'DESC' }]);
      expect(rootCall?.join).toBeUndefined();
    });

    it('should preserve non-federated joins in root query', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const commentsRelation = mockOneToManyRelation(
        'comments',
        'CommentEntity',
        { federated: false },
      );
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation, commentsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      postRepo.findAndCount.mockResolvedValue([[], 0]);

      await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }, { relation: 'comments' }],
      });

      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.join).toEqual([{ relation: 'comments' }]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // RELATION_FIRST strategy (relation filter)
  // ═════════════════════════════════════════════════════════════════════

  describe('RELATION_FIRST strategy (relation filter)', () => {
    it('should discover root IDs via relation query when filter targets relation', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        distinctFilter: {
          field: 'isLatest',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      // Discovery phase: peer query returns posts with userId references
      postRepo.findAndCount.mockResolvedValueOnce([
        [
          { id: 10, userId: 1, title: 'Match' },
          { id: 11, userId: 2, title: 'Also Match' },
        ],
        2,
      ]);

      // Constrained root fetch
      rootRepo.findAndCount.mockResolvedValue([
        [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        2,
      ]);
      rootRepo.count.mockResolvedValue(100);

      // Hydration fetch
      postRepo.findAndCount.mockResolvedValueOnce([
        [
          { id: 10, userId: 1, title: 'Match' },
          { id: 11, userId: 2, title: 'Also Match' },
        ],
        2,
      ]);

      const [data, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'title',
          operator: WhereOperator.EQ,
          value: 'Match',
          relation: 'posts',
        },
        join: [{ relation: 'posts' }],
      });

      expect(data).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('should return empty when relation discovery finds no matches', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        distinctFilter: {
          field: 'isLatest',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.count.mockResolvedValue(100);
      postRepo.findAndCount.mockResolvedValue([[], 0]);

      const [data, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'title',
          operator: WhereOperator.EQ,
          value: 'Nonexistent',
          relation: 'posts',
        },
        join: [{ relation: 'posts' }],
      });

      expect(data).toEqual([]);
      expect(total).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // RELATION_FIRST strategy (relation sort)
  // ═════════════════════════════════════════════════════════════════════

  describe('RELATION_FIRST strategy (relation sort)', () => {
    it('should use relation sort to drive root ordering', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        distinctFilter: {
          field: 'published',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      // Discovery: sorted relation data determines root order
      postRepo.findAndCount.mockResolvedValueOnce([
        [
          { id: 12, userId: 2, title: 'AAA', published: true },
          { id: 10, userId: 1, title: 'BBB', published: true },
        ],
        2,
      ]);

      // Constrained root fetch (comes back in DB order, not relation order)
      rootRepo.findAndCount.mockResolvedValue([
        [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        2,
      ]);
      rootRepo.count.mockResolvedValue(100);

      // Hydration fetch
      postRepo.findAndCount.mockResolvedValueOnce([
        [
          { id: 12, userId: 2, title: 'AAA', published: true },
          { id: 10, userId: 1, title: 'BBB', published: true },
        ],
        2,
      ]);

      const [data] = await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'posts' }],
        join: [{ relation: 'posts' }],
      });

      // Bob (userId=2) should be first because his post 'AAA' sorts before 'BBB'
      expect(data[0].id).toBe(2);
      expect(data[1].id).toBe(1);
    });

    it('should pass relation order to peer query during discovery', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        distinctFilter: {
          field: 'published',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      postRepo.findAndCount.mockResolvedValueOnce([
        [{ id: 10, userId: 1, title: 'Post', published: true }],
        1,
      ]);
      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      rootRepo.count.mockResolvedValue(1);
      postRepo.findAndCount.mockResolvedValueOnce([
        [{ id: 10, userId: 1, title: 'Post', published: true }],
        1,
      ]);

      await orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'posts' }],
        join: [{ relation: 'posts' }],
      });

      // First peer call (discovery) should include order
      const discoveryCall = postRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.order).toEqual([
        { field: 'title', order: 'ASC', relation: 'posts' },
      ]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // Pagination
  // ═════════════════════════════════════════════════════════════════════

  describe('pagination', () => {
    it('should apply take and skip to root query in ROOT_FIRST', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([
        [{ id: 3, name: 'Charlie' }],
        10,
      ]);
      postRepo.findAndCount.mockResolvedValue([[], 0]);

      const [data, total] = await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
        take: 1,
        skip: 2,
      });

      expect(data).toHaveLength(1);
      expect(total).toBe(10);

      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.take).toBe(1);
      expect(rootCall?.skip).toBe(2);
    });

    it('should use default limit when take is not specified', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      postRepo.findAndCount.mockResolvedValue([[], 0]);

      await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
      });

      // Default limit is only used in RELATION_FIRST buffer strategy;
      // ROOT_FIRST passes through the caller's take (undefined here)
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.take).toBeUndefined();
    });

    it('should compute accurate total in RELATION_FIRST as min of root and relation totals', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        distinctFilter: {
          field: 'isLatest',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.count.mockResolvedValue(50);

      // Discovery returns 3 matching relation rows (total=30)
      postRepo.findAndCount.mockResolvedValueOnce([
        [
          { id: 10, userId: 1, title: 'A' },
          { id: 11, userId: 2, title: 'B' },
        ],
        30,
      ]);

      // Constrained root fetch
      rootRepo.findAndCount.mockResolvedValue([
        [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        2,
      ]);

      // Hydration
      postRepo.findAndCount.mockResolvedValueOnce([
        [
          { id: 10, userId: 1, title: 'A' },
          { id: 11, userId: 2, title: 'B' },
        ],
        2,
      ]);

      const [, total] = await orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'title',
          operator: WhereOperator.CONTAINS,
          value: 'test',
          relation: 'posts',
        },
        join: [{ relation: 'posts' }],
      });

      // min(rootFilterTotal=50, relationTotal=30)
      expect(total).toBe(30);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // INNER JOIN behavior
  // ═════════════════════════════════════════════════════════════════════

  describe('INNER JOIN behavior', () => {
    it('should inject NOT_NULL filter on root FK for owning INNER JOIN', async () => {
      const blogRelation = mockOwningOneToOneRelation(
        'blog',
        'BlogEntity',
        'blogId',
      );
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [blogRelation],
      });
      const blogRepo = mockTestRepo('BlogEntity');
      const { orchestrator } = mockOrchestrator({ BlogEntity: blogRepo });

      rootRepo.findAndCount.mockResolvedValue([
        [{ id: 1, name: 'Alice', blogId: 100 }],
        1,
      ]);
      blogRepo.findAndCount.mockResolvedValue([
        [{ id: 100, title: 'Blog' }],
        1,
      ]);

      await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'blog', joinType: 'INNER' }],
      });

      // Root query should include NOT_NULL condition on blogId
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual({
        field: 'blogId',
        operator: WhereOperator.NOT_NULL,
      });
    });

    it('should inject NOT_NULL on target FK for non-owning INNER JOIN', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      // The NOT_NULL condition on userId triggers RELATION_FIRST
      postRepo.findAndCount.mockResolvedValueOnce([[{ id: 10, userId: 1 }], 1]);
      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      rootRepo.count.mockResolvedValue(1);
      postRepo.findAndCount.mockResolvedValueOnce([[{ id: 10, userId: 1 }], 1]);

      await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts', joinType: 'INNER' }],
      });

      // Discovery peer query should include NOT_NULL on userId
      const discoveryCall = postRepo.findAndCount.mock.calls[0][0];
      expect(discoveryCall?.where).toEqual(
        expect.objectContaining({
          field: 'userId',
          operator: WhereOperator.NOT_NULL,
        }),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // Context propagation
  // ═════════════════════════════════════════════════════════════════════

  describe('context propagation', () => {
    it('should pass ctx to all repository calls', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      const ctx = mockContext({ entity: 'UserEntity' });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      postRepo.findAndCount.mockResolvedValue([
        [{ id: 10, userId: 1, title: 'Post' }],
        1,
      ]);

      await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
        ctx,
      });

      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.ctx).toBe(ctx);

      const peerCall = postRepo.findAndCount.mock.calls[0][0];
      expect(peerCall?.ctx).toBe(ctx);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // Error handling
  // ═════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should throw when entity has no primary key', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      // Override columns to have no primary key
      (rootRepo.metadata as { columns: unknown[] }).columns = [];

      const { orchestrator } = mockOrchestrator({});

      await expect(
        orchestrator.findAndCount(rootRepo, {
          join: [{ relation: 'posts' }],
        }),
      ).rejects.toThrow(FederationException);
    });

    it('should throw when peer entity is not registered', async () => {
      const postsRelation = mockOneToManyRelation(
        'posts',
        'UnregisteredEntity',
      );
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      // No peer repo registered for UnregisteredEntity
      const { orchestrator } = mockOrchestrator({});

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);

      await expect(
        orchestrator.findAndCount(rootRepo, {
          join: [{ relation: 'posts' }],
        }),
      ).rejects.toThrow(FederationException);
    });

    it('should throw when sorting many-cardinality without distinctFilter', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      await expect(
        orchestrator.findAndCount(rootRepo, {
          order: [{ field: 'title', order: 'ASC', relation: 'posts' }],
          join: [{ relation: 'posts' }],
        }),
      ).rejects.toThrow(FederationException);
    });

    it('should throw when relation filter is inside OR compound', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      await expect(
        orchestrator.findAndCount(rootRepo, {
          where: {
            operator: 'or' as never,
            conditions: [
              { field: 'name', operator: WhereOperator.EQ, value: 'test' },
              {
                field: 'title',
                operator: WhereOperator.EQ,
                value: 'hello',
                relation: 'posts',
              },
            ],
          } as never,
          join: [{ relation: 'posts' }],
        }),
      ).rejects.toThrow(FederationException);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // Combined filters (root + relation)
  // ═════════════════════════════════════════════════════════════════════

  describe('combined root and relation filters', () => {
    it('should separate root where from relation-tagged conditions', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        distinctFilter: {
          field: 'isLatest',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.count.mockResolvedValue(5);

      // Discovery peer query
      postRepo.findAndCount.mockResolvedValueOnce([
        [{ id: 10, userId: 1, title: 'hello' }],
        1,
      ]);

      // Constrained root fetch
      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);

      // Hydration
      postRepo.findAndCount.mockResolvedValueOnce([
        [{ id: 10, userId: 1, title: 'hello' }],
        1,
      ]);

      await orchestrator.findAndCount(rootRepo, {
        where: {
          operator: 'and' as never,
          conditions: [
            { field: 'name', operator: WhereOperator.EQ, value: 'Alice' },
            {
              field: 'title',
              operator: WhereOperator.EQ,
              value: 'hello',
              relation: 'posts',
            },
          ],
        } as never,
        join: [{ relation: 'posts' }],
      });

      // RELATION_FIRST: root findAndCount is fetchConstrainedRoots
      // which ANDs the root condition with the discovered ID constraint
      const rootCall = rootRepo.findAndCount.mock.calls[0][0];
      expect(rootCall?.where).toEqual(
        Where.and(Where.eq('name', 'Alice'), Where.eq('id', 1)),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // Complex multi-relation scenario
  // ═════════════════════════════════════════════════════════════════════

  describe('complex scenario', () => {
    it('should handle multiple federated relations with mixed cardinality', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity');
      const profileRelation = mockOneToOneRelation('profile', 'ProfileEntity');
      const blogRelation = mockOwningOneToOneRelation(
        'blog',
        'BlogEntity',
        'blogId',
      );

      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation, profileRelation, blogRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const profileRepo = mockTestRepo<TestProfile>('ProfileEntity');
      const blogRepo = mockTestRepo('BlogEntity');
      const { orchestrator } = mockOrchestrator({
        PostEntity: postRepo,
        ProfileEntity: profileRepo,
        BlogEntity: blogRepo,
      });

      rootRepo.findAndCount.mockResolvedValue([
        [
          { id: 1, name: 'Alice', blogId: 100 },
          { id: 2, name: 'Bob', blogId: null },
        ],
        2,
      ]);
      postRepo.findAndCount.mockResolvedValue([
        [
          { id: 10, userId: 1, title: 'Post A' },
          { id: 11, userId: 2, title: 'Post B' },
        ],
        2,
      ]);
      profileRepo.findAndCount.mockResolvedValue([
        [{ id: 5, userId: 1, bio: 'Hello' }],
        1,
      ]);
      blogRepo.findAndCount.mockResolvedValue([
        [{ id: 100, title: 'Blog A' }],
        1,
      ]);

      const [data, total] = await orchestrator.findAndCount(rootRepo, {
        join: [
          { relation: 'posts' },
          { relation: 'profile' },
          { relation: 'blog' },
        ],
      });

      expect(total).toBe(2);
      expect(data).toHaveLength(2);

      // Alice: has posts, profile, and blog
      expect(data[0].posts).toEqual([{ id: 10, userId: 1, title: 'Post A' }]);
      expect(data[0].profile).toEqual({ id: 5, userId: 1, bio: 'Hello' });
      expect(data[0].blog).toEqual({ id: 100, title: 'Blog A' });

      // Bob: has posts, no profile, no blog (FK is null)
      expect(data[1].posts).toEqual([{ id: 11, userId: 2, title: 'Post B' }]);
      expect(data[1].profile).toBeNull();
      expect(data[1].blog).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // distinctFilter handling
  // ═════════════════════════════════════════════════════════════════════

  describe('distinctFilter', () => {
    it('should include distinctFilter in peer query conditions', async () => {
      const postsRelation = mockOneToManyRelation('posts', 'PostEntity', {
        distinctFilter: {
          field: 'published',
          operator: WhereOperator.EQ,
          value: true,
        },
      });
      const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
        relations: [postsRelation],
      });
      const postRepo = mockTestRepo<TestRelation>('PostEntity');
      const { orchestrator } = mockOrchestrator({ PostEntity: postRepo });

      rootRepo.findAndCount.mockResolvedValue([[{ id: 1, name: 'Alice' }], 1]);
      postRepo.findAndCount.mockResolvedValue([
        [{ id: 10, userId: 1, title: 'Post', published: true }],
        1,
      ]);

      await orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts' }],
      });

      // Hydration peer query should include the distinctFilter condition
      const peerCall = postRepo.findAndCount.mock.calls[0][0];
      const whereStr = JSON.stringify(peerCall?.where);
      expect(whereStr).toContain('"field":"published"');
      expect(whereStr).toContain(`"operator":"${WhereOperator.EQ}"`);
    });
  });
});
