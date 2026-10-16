import { type DataSource } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { getDynamicRepositoryToken, Where } from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import {
  AUTHOR_ENTITY_TOKEN,
  COMMENT_ENTITY_TOKEN,
  DOC_ENTITY_TOKEN,
  EAGER_COMMENT_ENTITY_TOKEN,
  POST_ENTITY_TOKEN,
  PROFILE_ENTITY_TOKEN,
  TAG_ENTITY_TOKEN,
} from '../../__fixtures__/repository/config/relation.constants.fixture.js';
import { AuthorEntityFixture } from '../../__fixtures__/repository/entity/author.entity.fixture.js';
import { CommentEntityFixture } from '../../__fixtures__/repository/entity/comment.entity.fixture.js';
import { DocEntityFixture } from '../../__fixtures__/repository/entity/doc.entity.fixture.js';
import { PostEntityFixture } from '../../__fixtures__/repository/entity/post.entity.fixture.js';
import { type ProfileEntityFixture } from '../../__fixtures__/repository/entity/profile.entity.fixture.js';
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
  let commentRepo: TypeOrmRepository<CommentEntityFixture>;
  let eagerCommentRepo: TypeOrmRepository<CommentEntityFixture>;
  let docRepo: TypeOrmRepository<DocEntityFixture>;
  let profileRepo: TypeOrmRepository<ProfileEntityFixture>;
  let seedingSource: SeedingSource;
  let authorFactory: AuthorFactoryFixture;
  let postFactory: PostFactoryFixture;
  let tagFactory: TagFactoryFixture;
  let dataSource: DataSource;

  /**
   * Link tags to posts through the junction table directly. The repository
   * refuses many-to-many writes, so seeding goes around it.
   */
  const linkPosts = (tag: TagEntityFixture, posts: PostEntityFixture[]) =>
    dataSource
      .createQueryBuilder()
      .relation(TagEntityFixture, 'posts')
      .of(tag)
      .add(posts);

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

    commentRepo = moduleFixture.get<TypeOrmRepository<CommentEntityFixture>>(
      getDynamicRepositoryToken(COMMENT_ENTITY_TOKEN),
    );
    commentRepo.bind({});

    eagerCommentRepo = moduleFixture.get<
      TypeOrmRepository<CommentEntityFixture>
    >(getDynamicRepositoryToken(EAGER_COMMENT_ENTITY_TOKEN));
    eagerCommentRepo.bind({ allowEagerRelations: true });

    docRepo = moduleFixture.get<TypeOrmRepository<DocEntityFixture>>(
      getDynamicRepositoryToken(DOC_ENTITY_TOKEN),
    );

    profileRepo = moduleFixture.get<TypeOrmRepository<ProfileEntityFixture>>(
      getDynamicRepositoryToken(PROFILE_ENTITY_TOKEN),
    );

    dataSource = moduleFixture.get(getDataSourceToken());
    seedingSource = new SeedingSource({ dataSource });

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

    it('leaves a soft-deleted row out of a to-many join', async () => {
      await postRepo.softDelete(post1);

      const [found] = await authorRepo.find({
        where: Where.eq('id', author.id),
        join: [{ relation: 'posts' }],
      });

      expect(found.posts.map((post) => post.title)).toEqual(['Second Post']);
    });

    it('joins a soft-deleted row when the read asks for deleted rows', async () => {
      await postRepo.softDelete(post1);

      const [found] = await authorRepo.find({
        where: Where.eq('id', author.id),
        join: [{ relation: 'posts' }],
        withDeleted: true,
      });

      expect(found.posts.map((post) => post.title).sort()).toEqual([
        'First Post',
        'Second Post',
      ]);
    });

    it('leaves a soft-deleted row out of a to-one join, keeping the root', async () => {
      await authorRepo.softDelete(author);

      const found = await postRepo.findOne({
        where: Where.eq('id', post1.id),
        join: [{ relation: 'author' }],
      });

      expect(found?.id).toBe(post1.id);
      expect(found?.author).toBeNull();
    });

    it('keeps only roots with a related row when filtering on a to-many relation key', async () => {
      await authorFactory.create({ name: 'Bob' });

      const [found, total] = await authorRepo.findAndCount({
        where: Where.rel('posts', Where.notNull('authorId')),
        join: [{ relation: 'posts' }],
      });

      expect(found.map((row) => row.name)).toEqual(['Alice']);
      expect(total).toBe(1);
    });

    it('keeps only roots with a related row when filtering on a to-one relation key', async () => {
      await authorRepo.softDelete(author);

      const [found, total] = await postRepo.findAndCount({
        where: Where.rel('author', Where.notNull('id')),
        join: [{ relation: 'author' }],
      });

      expect(found).toEqual([]);
      expect(total).toBe(0);
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

    it('matches text on root and relation columns in one query', async () => {
      const [results, total] = await postRepo.findAndCount({
        where: Where.and(
          Where.contains('title', 'First'),
          Where.rel('author', Where.starts('name', 'Ali')),
        ),
        join: [{ relation: 'author' }],
      });

      expect(results.map((p) => p.title)).toEqual(['First Post']);
      expect(total).toBe(1);
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

      await linkPosts(tag1, [post1, post2]);
      await linkPosts(tag2, [post1]);
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

      await linkPosts(tag1, [post1, post2]);
      await linkPosts(tag2, [post1]);
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

  describe('relation metadata', () => {
    it("names an entity's rows by database and table", () => {
      expect(authorRepo.metadata.urn).toBe(
        'urn:typeorm::memory::author_entity_fixture',
      );
    });

    it("reports each target's and junction's URN as that entity reports its own", () => {
      const relation = (name: string) =>
        postRepo.metadata.relations?.find((r) => r.name === name);

      expect(relation('author')?.targetUrn).toBe(authorRepo.metadata.urn);
      expect(relation('tags')?.targetUrn).toBe(tagRepo.metadata.urn);
      expect(relation('tags')?.through?.urn).toBe(
        'urn:typeorm::memory::post_tags',
      );
    });

    it('reports the foreign key of an owning relation', () => {
      expect(
        postRepo.metadata.relations?.find(
          (relation) => relation.name === 'author',
        ),
      ).toEqual({
        name: 'author',
        targetEntity: 'AuthorEntityFixture',
        targetUrn: authorRepo.metadata.urn,
        targetColumns: authorRepo.metadata.columns,
        cardinality: 'one',
        on: { from: 'authorId', to: 'id' },
        foreignKey: [{ from: 'authorId', to: 'id' }],
      });
    });

    it('reports no foreign key for the inverse side', () => {
      expect(authorRepo.metadata.relations).toEqual([
        {
          name: 'posts',
          targetEntity: 'PostEntityFixture',
          targetUrn: postRepo.metadata.urn,
          targetColumns: postRepo.metadata.columns,
          cardinality: 'many',
          on: { from: 'id', to: 'authorId' },
        },
      ]);
    });

    it('reports a foreign key with no column of its own, and no column for it', () => {
      expect(
        commentRepo.metadata.relations?.find(
          (relation) => relation.name === 'reviewer',
        )?.foreignKey,
      ).toEqual([{ from: 'reviewer', to: 'id' }]);
      expect(
        commentRepo.metadata.columns.map((column) => column.name),
      ).not.toContain('reviewer');
    });
  });

  describe('primary keys', () => {
    it('reports every column of a composite primary key', () => {
      expect(
        docRepo.metadata.columns
          .filter((column) => column.isPrimary)
          .map((column) => column.name),
      ).toEqual(['slug', 'locale']);
    });

    it('stores and returns a caller-supplied composite key', async () => {
      const created = await docRepo.create({
        slug: 'home',
        locale: 'fr',
        body: 'accueil',
      });

      expect(created).toEqual({ slug: 'home', locale: 'fr', body: 'accueil' });
      expect(await dataSource.getRepository(DocEntityFixture).find()).toEqual([
        { slug: 'home', locale: 'fr', body: 'accueil' },
      ]);
    });

    it('reports a primary key that is also a join column', () => {
      expect(
        profileRepo.metadata.columns.find(
          (column) => column.name === 'authorId',
        )?.isPrimary,
      ).toBe(true);
      expect(
        profileRepo.metadata.relations?.find(
          (relation) => relation.name === 'author',
        )?.foreignKey,
      ).toEqual([{ from: 'authorId', to: 'id' }]);
    });
  });

  describe('foreign key writes', () => {
    /**
     * A versioned update re-reads the row before saving. The relation comes
     * back with it, loaded eagerly or set to `null` by the class, and must
     * not override the payload's foreign key.
     */
    describe('on a versioned entity', () => {
      let first: PostEntityFixture;
      let second: PostEntityFixture;
      let comment: CommentEntityFixture;

      beforeEach(async () => {
        const author = await authorFactory.create({ name: 'Author' });
        [first, second] = await postFactory.createMany(2, {
          authorId: author.id,
        });
        const { id } = await dataSource
          .getRepository(CommentEntityFixture)
          .save({ postId: first.id });
        const loaded = await commentRepo.findOne({ where: Where.eq('id', id) });
        if (!loaded) throw new Error('fixture precondition failed');
        comment = loaded;
      });

      it('applies a new foreign key', async () => {
        await commentRepo.update(comment, { postId: second.id });

        const stored = await dataSource
          .getRepository(CommentEntityFixture)
          .findOneByOrFail({ id: comment.id });
        expect(stored.postId).toBe(second.id);
        expect(stored.version).toBe(comment.version + 1);
      });

      it('writes nothing the entity class initializes', async () => {
        await dataSource
          .getRepository(CommentEntityFixture)
          .update({ id: comment.id }, { status: 'published' });

        await commentRepo.upsert({ id: comment.id, body: 'upserted' });

        const stored = await dataSource
          .getRepository(CommentEntityFixture)
          .findOneByOrFail({ id: comment.id });
        expect(stored).toEqual(
          expect.objectContaining({
            body: 'upserted',
            status: 'published',
            postId: first.id,
          }),
        );
      });

      it('returns no relation the read did not join', async () => {
        const found = await commentRepo.findOne({
          where: Where.eq('id', comment.id),
        });

        expect(found && Object.keys(found).sort()).toEqual(
          commentRepo.metadata.columns.map(({ name }) => name).sort(),
        );
        expect(found).toBeInstanceOf(CommentEntityFixture);
      });

      it('loads an eager relation for a repository that allows it', async () => {
        const found = await eagerCommentRepo.findOne({
          where: Where.eq('id', comment.id),
        });

        expect(found?.post?.id).toBe(first.id);
      });

      it('returns no relation it did not load, even for a repository that allows eager relations', async () => {
        const upserted = await eagerCommentRepo.upsert({
          id: comment.id,
          body: 'upserted',
        });

        expect(Object.keys(upserted).sort()).toEqual(
          eagerCommentRepo.metadata.columns.map(({ name }) => name).sort(),
        );
      });

      it('returns every own column for an empty select', async () => {
        const found = await commentRepo.findOne({
          where: Where.eq('id', comment.id),
          select: [],
        });

        expect(found && Object.keys(found).sort()).toEqual(
          commentRepo.metadata.columns.map(({ name }) => name).sort(),
        );
      });

      it('returns a joined relation holding only its own columns', async () => {
        const found = await postRepo.findOne({
          where: Where.eq('id', first.id),
          join: [{ relation: 'author' }],
        });

        expect(found?.author && Object.keys(found.author).sort()).toEqual(
          authorRepo.metadata.columns.map(({ name }) => name).sort(),
        );
      });

      it('returns a row an update can take back', async () => {
        const updated = await commentRepo.update(comment, { body: 'first' });

        await commentRepo.update(updated, { body: 'second' });

        const stored = await dataSource
          .getRepository(CommentEntityFixture)
          .findOneByOrFail({ id: comment.id });
        expect(stored.body).toBe('second');
      });

      it('keeps the foreign key when another column changes', async () => {
        await commentRepo.update(comment, { body: 'edited' });

        const stored = await dataSource
          .getRepository(CommentEntityFixture)
          .findOneByOrFail({ id: comment.id });
        expect(stored).toEqual(
          expect.objectContaining({ body: 'edited', postId: first.id }),
        );
      });
    });
  });
});
