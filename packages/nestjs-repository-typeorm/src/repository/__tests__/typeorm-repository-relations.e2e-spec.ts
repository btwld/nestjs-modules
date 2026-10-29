import { type DataSource } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { getDynamicRepositoryToken, Where } from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import {
  AUTHOR_ENTITY_TOKEN,
  COMMENT_ENTITY_TOKEN,
  EAGER_COMMENT_ENTITY_TOKEN,
  POST_ENTITY_TOKEN,
  PROFILE_ENTITY_TOKEN,
} from '../../__fixtures__/repository/config/relation.constants.fixture.js';
import { AuthorEntityFixture } from '../../__fixtures__/repository/entity/author.entity.fixture.js';
import { CommentEntityFixture } from '../../__fixtures__/repository/entity/comment.entity.fixture.js';
import { PostEntityFixture } from '../../__fixtures__/repository/entity/post.entity.fixture.js';
import { type ProfileEntityFixture } from '../../__fixtures__/repository/entity/profile.entity.fixture.js';
import { AuthorFactoryFixture } from '../../__fixtures__/repository/factory/author.factory.fixture.js';
import { PostFactoryFixture } from '../../__fixtures__/repository/factory/post.factory.fixture.js';
import { RelationAppModuleFixture } from '../../__fixtures__/repository/module/relation-app.module.fixture.js';
import { type TypeOrmRepository } from '../typeorm-repository.js';

/**
 * How the TypeORM driver reports and writes relations beyond the driver
 * contract, which `typeorm-conformance.e2e-spec.ts` covers.
 */
describe('TypeOrmRepository (relations)', () => {
  let authorRepo: TypeOrmRepository<AuthorEntityFixture>;
  let postRepo: TypeOrmRepository<PostEntityFixture>;
  let commentRepo: TypeOrmRepository<CommentEntityFixture>;
  let eagerCommentRepo: TypeOrmRepository<CommentEntityFixture>;
  let profileRepo: TypeOrmRepository<ProfileEntityFixture>;
  let seedingSource: SeedingSource;
  let authorFactory: AuthorFactoryFixture;
  let postFactory: PostFactoryFixture;
  let dataSource: DataSource;

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

    commentRepo = moduleFixture.get<TypeOrmRepository<CommentEntityFixture>>(
      getDynamicRepositoryToken(COMMENT_ENTITY_TOKEN),
    );
    commentRepo.bind({});

    eagerCommentRepo = moduleFixture.get<
      TypeOrmRepository<CommentEntityFixture>
    >(getDynamicRepositoryToken(EAGER_COMMENT_ENTITY_TOKEN));
    eagerCommentRepo.bind({ allowEagerRelations: true });

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('relation metadata', () => {
    it("names an entity's rows, and a junction's, by database and table", () => {
      expect(authorRepo.metadata.urn).toBe(
        'urn:typeorm::memory::author_entity_fixture',
      );
      expect(
        postRepo.metadata.relations?.find(({ name }) => name === 'tags')
          ?.through?.urn,
      ).toBe('urn:typeorm::memory::post_tags');
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
