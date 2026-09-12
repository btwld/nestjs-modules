import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  Where,
  RepositoryModule,
} from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { relationOrmConfig } from '../../__fixtures__/repository/config/relation-ormconfig.fixture.js';
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
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

describe('TypeOrmRepository relation actions (e2e)', () => {
  describe('metadata population', () => {
    let moduleFixture: TestingModule;
    let authorRepo: TypeOrmRepository<AuthorEntityFixture>;
    let postRepo: TypeOrmRepository<PostEntityFixture>;

    beforeEach(async () => {
      @Module({
        imports: [
          TypeOrmModule.forRoot(relationOrmConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: AUTHOR_ENTITY_TOKEN,
                entity: AuthorEntityFixture,
                relations: {
                  posts: { onDelete: 'delegate' },
                },
              },
              { key: POST_ENTITY_TOKEN, entity: PostEntityFixture },
              { key: TAG_ENTITY_TOKEN, entity: TagEntityFixture },
            ],
          }),
        ],
      })
      class TestModule {}

      moduleFixture = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      authorRepo = moduleFixture.get<TypeOrmRepository<AuthorEntityFixture>>(
        getDynamicRepositoryToken(AUTHOR_ENTITY_TOKEN),
      );

      postRepo = moduleFixture.get<TypeOrmRepository<PostEntityFixture>>(
        getDynamicRepositoryToken(POST_ENTITY_TOKEN),
      );
    });

    afterEach(async () => {
      vi.clearAllMocks();
      await moduleFixture.close();
    });

    it('should store onDelete in relation metadata', () => {
      const postsRel = authorRepo.metadata.relations?.find(
        (r) => r.name === 'posts',
      );
      expect(postsRel).toBeDefined();
      expect(postsRel!.onDelete).toBe('delegate');
    });

    it('should leave onDelete undefined when not configured', () => {
      const authorRel = postRepo.metadata.relations?.find(
        (r) => r.name === 'author',
      );
      expect(authorRel).toBeDefined();
      expect(authorRel!.onDelete).toBeUndefined();
    });

    it('should leave onUpdate undefined when not configured', () => {
      const postsRel = authorRepo.metadata.relations?.find(
        (r) => r.name === 'posts',
      );
      expect(postsRel).toBeDefined();
      expect(postsRel!.onUpdate).toBeUndefined();
    });
  });

  describe('delegate behavior', () => {
    let moduleFixture: TestingModule;
    let authorRepo: TypeOrmRepository<AuthorEntityFixture>;
    let seedingSource: SeedingSource;
    let authorFactory: AuthorFactoryFixture;
    let postFactory: PostFactoryFixture;

    beforeEach(async () => {
      @Module({
        imports: [
          TypeOrmModule.forRoot(relationOrmConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: AUTHOR_ENTITY_TOKEN,
                entity: AuthorEntityFixture,
                relations: {
                  posts: { onDelete: 'delegate' },
                },
              },
              { key: POST_ENTITY_TOKEN, entity: PostEntityFixture },
              { key: TAG_ENTITY_TOKEN, entity: TagEntityFixture },
            ],
          }),
        ],
      })
      class TestModule {}

      moduleFixture = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      authorRepo = moduleFixture.get<TypeOrmRepository<AuthorEntityFixture>>(
        getDynamicRepositoryToken(AUTHOR_ENTITY_TOKEN),
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
    });

    afterEach(async () => {
      vi.clearAllMocks();
      await moduleFixture.close();
    });

    it('should delete entity without related records', async () => {
      const author = await authorFactory.create({ name: 'Solo' });
      const deleted = await authorRepo.delete(author);
      expect(deleted.name).toBe('Solo');

      const found = await authorRepo.findOne({
        where: Where.eq('id', author.id),
      });
      expect(found).toBeNull();
    });

    it('should fail when native schema has no cascade configured', async () => {
      const author = await authorFactory.create({ name: 'HasPosts' });
      await postFactory.create({ title: 'Post1', authorId: author.id });

      // PostEntityFixture has no onDelete: 'CASCADE' on its FK,
      // so delegate defers to native schema which rejects the delete.
      await expect(authorRepo.delete(author)).rejects.toThrow();
    });
  });
});
