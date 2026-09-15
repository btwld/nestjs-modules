import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { RuntimeException } from '@concepta/nestjs-core';
import { getDynamicRepositoryToken, Where } from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import {
  AUTHOR_ENTITY_TOKEN,
  POST_ENTITY_TOKEN,
  TAG_ENTITY_TOKEN,
} from '../../__fixtures__/repository/config/relation.constants.fixture.js';
import { AuthorEntityFixture } from '../../__fixtures__/repository/entity/author.entity.fixture.js';
import { PostEntityFixture } from '../../__fixtures__/repository/entity/post.entity.fixture.js';
import { TagEntityFixture } from '../../__fixtures__/repository/entity/tag.entity.fixture.js';
import { AuthorFactoryFixture } from '../../__fixtures__/repository/factory/author.factory.fixture.js';
import { PostFactoryFixture } from '../../__fixtures__/repository/factory/post.factory.fixture.js';
import { TagFactoryFixture } from '../../__fixtures__/repository/factory/tag.factory.fixture.js';
import { RelationAppModuleFixture } from '../../__fixtures__/repository/module/relation-app.module.fixture.js';
import { type TypeOrmRepository } from '../typeorm-repository.js';

describe('TypeOrmRepository (relations)', () => {
  let authorRepo: TypeOrmRepository<AuthorEntityFixture>;
  let postRepo: TypeOrmRepository<PostEntityFixture>;
  let tagRepo: TypeOrmRepository<TagEntityFixture>;
  let seedingSource: SeedingSource;
  let authorFactory: AuthorFactoryFixture;
  let postFactory: PostFactoryFixture;
  let tagFactory: TagFactoryFixture;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RelationAppModuleFixture],
    }).compile();

    authorRepo = moduleFixture.get<TypeOrmRepository<AuthorEntityFixture>>(
      getDynamicRepositoryToken(AUTHOR_ENTITY_TOKEN),
    );

    postRepo = moduleFixture.get<TypeOrmRepository<PostEntityFixture>>(
      getDynamicRepositoryToken(POST_ENTITY_TOKEN),
    );

    tagRepo = moduleFixture.get<TypeOrmRepository<TagEntityFixture>>(
      getDynamicRepositoryToken(TAG_ENTITY_TOKEN),
    );

    seedingSource = new SeedingSource({
      dataSource: moduleFixture.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    authorFactory = new AuthorFactoryFixture({
      entity: AuthorEntityFixture,
      seedingSource,
    });

    postFactory = new PostFactoryFixture({
      entity: PostEntityFixture,
      seedingSource,
    });

    tagFactory = new TagFactoryFixture({
      entity: TagEntityFixture,
      seedingSource,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveJoinClauses', () => {
    it('should pass through valid join clauses', () => {
      const input = [{ relation: 'posts' }];
      const resolved = authorRepo['resolveJoinClauses'](input);
      expect(resolved).toBe(input);
    });

    it('should throw RuntimeException for unknown relation', () => {
      expect(() => {
        authorRepo['resolveJoinClauses']([{ relation: 'nonexistent' }]);
      }).toThrow(RuntimeException);
    });

    it('should return undefined for empty array', () => {
      expect(authorRepo['resolveJoinClauses']([])).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(authorRepo['resolveJoinClauses'](undefined)).toBeUndefined();
    });
  });

  describe('find with join', () => {
    let author: AuthorEntityFixture;
    let post1: PostEntityFixture;

    beforeEach(async () => {
      author = await authorFactory.create({ name: 'Alice' });

      post1 = await postFactory.create({
        title: 'First Post',
        authorId: author.id,
      });

      await postFactory.create({
        title: 'Second Post',
        authorId: author.id,
      });
    });

    it('should return author with posts populated via join', async () => {
      const results = await authorRepo.find({
        where: Where.eq('id', author.id),
        join: [{ relation: 'posts' }],
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(author.id);
      expect(results[0].posts).toHaveLength(2);

      const titles = results[0].posts.map((p) => p.title).sort();
      expect(titles).toEqual(['First Post', 'Second Post']);
    });

    it('should return post with author populated via join', async () => {
      const result = await postRepo.findOne({
        where: Where.eq('id', post1.id),
        join: [{ relation: 'author' }],
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe(post1.id);
      expect(result!.author).toBeDefined();
      expect(result!.author.id).toBe(author.id);
      expect(result!.author.name).toBe('Alice');
    });

    it('should not populate relations without join', async () => {
      const results = await authorRepo.find({
        where: Where.eq('id', author.id),
      });

      expect(results).toHaveLength(1);
      expect(results[0].posts).toBeUndefined();
    });

    it('should return author with empty posts when no posts exist', async () => {
      const lonelyAuthor = await authorFactory.create({ name: 'Bob' });

      const results = await authorRepo.find({
        where: Where.eq('id', lonelyAuthor.id),
        join: [{ relation: 'posts' }],
      });

      expect(results).toHaveLength(1);
      expect(results[0].posts).toEqual([]);
    });

    it('should work with findOne and join', async () => {
      const result = await authorRepo.findOne({
        where: Where.eq('id', author.id),
        join: [{ relation: 'posts' }],
      });

      expect(result).toBeDefined();
      expect(result!.posts).toHaveLength(2);
    });

    it('should filter on root entity while populating join', async () => {
      const otherAuthor = await authorFactory.create({ name: 'Charlie' });
      await postFactory.create({
        title: 'Other Post',
        authorId: otherAuthor.id,
      });

      const results = await authorRepo.find({
        where: Where.eq('name', 'Alice'),
        join: [{ relation: 'posts' }],
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice');
      expect(results[0].posts).toHaveLength(2);
    });

    it('should return multiple posts for an author via post repo', async () => {
      const results = await postRepo.find({
        where: Where.eq('authorId', author.id),
        join: [{ relation: 'author' }],
      });

      expect(results).toHaveLength(2);
      const titles = results.map((p) => p.title).sort();
      expect(titles).toEqual(['First Post', 'Second Post']);
      expect(results[0].author.id).toBe(author.id);
      expect(results[1].author.id).toBe(author.id);
    });

    it('should filter on relation field using Where.rel()', async () => {
      const results = await postRepo.find({
        where: Where.rel('author', Where.eq('name', 'Alice')),
        join: [{ relation: 'author' }],
      });

      expect(results).toHaveLength(2);
      const titles = results.map((p) => p.title).sort();
      expect(titles).toEqual(['First Post', 'Second Post']);
      expect(results[0].author.name).toBe('Alice');
    });

    it('should return empty when relation filter matches nothing', async () => {
      const results = await postRepo.find({
        where: Where.rel('author', Where.eq('name', 'Nobody')),
        join: [{ relation: 'author' }],
      });

      expect(results).toHaveLength(0);
    });

    it('should combine root and relation filters', async () => {
      const results = await postRepo.find({
        where: Where.and(
          Where.eq('title', 'First Post'),
          Where.rel('author', Where.eq('name', 'Alice')),
        ),
        join: [{ relation: 'author' }],
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('First Post');
      expect(results[0].author.name).toBe('Alice');
    });

    it('should work with findAndCount and join', async () => {
      const [results, count] = await authorRepo.findAndCount({
        join: [{ relation: 'posts' }],
      });

      expect(count).toBe(1);
      expect(results).toHaveLength(1);
      expect(results[0].posts).toHaveLength(2);
    });
  });

  describe('many-to-many join', () => {
    let author: AuthorEntityFixture;
    let post1: PostEntityFixture;
    let post2: PostEntityFixture;
    let tag1: TagEntityFixture;
    let tag2: TagEntityFixture;

    beforeEach(async () => {
      author = await authorFactory.create({ name: 'Alice' });

      post1 = await postFactory.create({
        title: 'First Post',
        authorId: author.id,
      });

      post2 = await postFactory.create({
        title: 'Second Post',
        authorId: author.id,
      });

      tag1 = await tagFactory.create({ label: 'TypeScript' });
      tag2 = await tagFactory.create({ label: 'NestJS' });

      // Associate tags with posts via owning side (Tag)
      tag1.posts = [post1, post2];
      await tagRepo.create(tag1);

      tag2.posts = [post1];
      await tagRepo.create(tag2);
    });

    it('should return tag with posts populated via M2M join (owning side)', async () => {
      const results = await tagRepo.find({
        where: Where.eq('id', tag1.id),
        join: [{ relation: 'posts' }],
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(tag1.id);
      expect(results[0].posts).toHaveLength(2);

      const titles = results[0].posts.map((p) => p.title).sort();
      expect(titles).toEqual(['First Post', 'Second Post']);
    });

    it('should return post with tags populated via M2M join (non-owning side)', async () => {
      const result = await postRepo.findOne({
        where: Where.eq('id', post1.id),
        join: [{ relation: 'tags' }],
      });

      expect(result).toBeDefined();
      expect(result!.tags).toHaveLength(2);

      const labels = result!.tags.map((t) => t.label).sort();
      expect(labels).toEqual(['NestJS', 'TypeScript']);
    });

    it('should return empty tags when post has none', async () => {
      const lonelyPost = await postFactory.create({
        title: 'No Tags',
        authorId: author.id,
      });

      const result = await postRepo.findOne({
        where: Where.eq('id', lonelyPost.id),
        join: [{ relation: 'tags' }],
      });

      expect(result).toBeDefined();
      expect(result!.tags).toEqual([]);
    });

    it('should not populate M2M relations without join', async () => {
      const results = await tagRepo.find({
        where: Where.eq('id', tag1.id),
      });

      expect(results).toHaveLength(1);
      expect(results[0].posts).toBeUndefined();
    });

    it('should filter on M2M relation using Where.rel()', async () => {
      const results = await postRepo.find({
        where: Where.rel('tags', Where.eq('label', 'TypeScript')),
        join: [{ relation: 'tags' }],
      });

      expect(results).toHaveLength(2);
      const titles = results.map((p) => p.title).sort();
      expect(titles).toEqual(['First Post', 'Second Post']);
    });

    it('should work with findAndCount and M2M join', async () => {
      const [results, count] = await tagRepo.findAndCount({
        join: [{ relation: 'posts' }],
      });

      expect(count).toBe(2);
      expect(results).toHaveLength(2);

      const tag1Result = results.find((t) => t.id === tag1.id);
      const tag2Result = results.find((t) => t.id === tag2.id);
      expect(tag1Result!.posts).toHaveLength(2);
      expect(tag2Result!.posts).toHaveLength(1);
    });
  });

  describe('multi-join', () => {
    let author: AuthorEntityFixture;
    let post1: PostEntityFixture;
    let post2: PostEntityFixture;
    let tag1: TagEntityFixture;
    let tag2: TagEntityFixture;

    beforeEach(async () => {
      author = await authorFactory.create({ name: 'Alice' });

      post1 = await postFactory.create({
        title: 'First Post',
        authorId: author.id,
      });

      post2 = await postFactory.create({
        title: 'Second Post',
        authorId: author.id,
      });

      tag1 = await tagFactory.create({ label: 'TypeScript' });
      tag2 = await tagFactory.create({ label: 'NestJS' });

      tag1.posts = [post1, post2];
      await tagRepo.create(tag1);

      tag2.posts = [post1];
      await tagRepo.create(tag2);
    });

    it('should populate both author and tags via two joins on find', async () => {
      const results = await postRepo.find({
        where: Where.eq('id', post1.id),
        join: [{ relation: 'author' }, { relation: 'tags' }],
      });

      expect(results).toHaveLength(1);
      expect(results[0].author).toBeDefined();
      expect(results[0].author.name).toBe('Alice');
      expect(results[0].tags).toHaveLength(2);
      const labels = results[0].tags.map((t) => t.label).sort();
      expect(labels).toEqual(['NestJS', 'TypeScript']);
    });

    it('should populate both relations via two joins on findOne', async () => {
      const result = await postRepo.findOne({
        where: Where.eq('id', post2.id),
        join: [{ relation: 'author' }, { relation: 'tags' }],
      });

      expect(result).toBeDefined();
      expect(result!.author.id).toBe(author.id);
      expect(result!.tags).toHaveLength(1);
      expect(result!.tags[0].label).toBe('TypeScript');
    });

    it('should populate both relations via two joins on findAndCount', async () => {
      const [results, count] = await postRepo.findAndCount({
        where: Where.eq('authorId', author.id),
        join: [{ relation: 'author' }, { relation: 'tags' }],
      });

      expect(count).toBe(2);
      expect(results).toHaveLength(2);
      for (const post of results) {
        expect(post.author.name).toBe('Alice');
        expect(post.tags.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should filter on one relation while joining both', async () => {
      const results = await postRepo.find({
        where: Where.rel('tags', Where.eq('label', 'NestJS')),
        join: [{ relation: 'author' }, { relation: 'tags' }],
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('First Post');
      expect(results[0].author.name).toBe('Alice');
      expect(results[0].tags.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('relation sort', () => {
    let authorAlice: AuthorEntityFixture;
    let authorZara: AuthorEntityFixture;
    let alicePost: PostEntityFixture;
    let _zaraPost: PostEntityFixture;

    beforeEach(async () => {
      authorAlice = await authorFactory.create({ name: 'Alice' });
      authorZara = await authorFactory.create({ name: 'Zara' });

      alicePost = await postFactory.create({
        title: 'Alice-Post',
        authorId: authorAlice.id,
      });

      _zaraPost = await postFactory.create({
        title: 'Zara-Post',
        authorId: authorZara.id,
      });
    });

    it('should sort by relation field ASC', async () => {
      const results = await postRepo.find({
        join: [{ relation: 'author' }],
        order: [{ field: 'name', order: 'ASC', relation: 'author' }],
      });

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Alice-Post');
      expect(results[1].title).toBe('Zara-Post');
    });

    it('should sort by relation field DESC', async () => {
      const results = await postRepo.find({
        join: [{ relation: 'author' }],
        order: [{ field: 'name', order: 'DESC', relation: 'author' }],
      });

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Zara-Post');
      expect(results[1].title).toBe('Alice-Post');
    });

    it('should combine root sort with relation sort', async () => {
      await postFactory.create({
        title: 'Alice-Second',
        authorId: authorAlice.id,
      });

      const results = await postRepo.find({
        join: [{ relation: 'author' }],
        order: [
          { field: 'name', order: 'ASC', relation: 'author' },
          { field: 'title', order: 'DESC' },
        ],
      });

      expect(results).toHaveLength(3);
      // Alice's posts first (author ASC), then sorted by title DESC
      expect(results[0].title).toBe('Alice-Second');
      expect(results[1].title).toBe('Alice-Post');
      // Zara's post last
      expect(results[2].title).toBe('Zara-Post');
    });

    it('should return entity with relation via findOne with order', async () => {
      const result = await postRepo.findOne({
        where: Where.eq('id', alicePost.id),
        join: [{ relation: 'author' }],
        order: [{ field: 'name', order: 'ASC', relation: 'author' }],
      });

      expect(result).toBeDefined();
      expect(result!.title).toBe('Alice-Post');
      expect(result!.author.name).toBe('Alice');
    });
  });
});
