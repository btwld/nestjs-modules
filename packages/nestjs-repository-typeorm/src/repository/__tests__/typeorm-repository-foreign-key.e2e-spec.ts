import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  Where,
  RepositoryDatabaseException,
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

/**
 * What happens to related rows on delete is the database's foreign key
 * decision; the repository adds nothing of its own.
 */
/** The database's foreign key refusal, as the driver reports it. */
function foreignKeyFailure(entityKey: string) {
  return expect.objectContaining({
    name: RepositoryDatabaseException.name,
    message:
      `The better-sqlite3 database failed a query on the ${entityKey} ` +
      'repository: FOREIGN KEY constraint failed',
    context: expect.objectContaining({
      database: 'better-sqlite3',
      code: 'SQLITE_CONSTRAINT_FOREIGNKEY',
    }),
  });
}

describe('TypeOrmRepository foreign keys (e2e)', () => {
  describe('on delete', () => {
    let moduleFixture: TestingModule;
    let authorRepo: TypeOrmRepository<AuthorEntityFixture>;
    let postRepo: TypeOrmRepository<PostEntityFixture>;
    let seedingSource: SeedingSource;
    let authorFactory: AuthorFactoryFixture;
    let postFactory: PostFactoryFixture;

    beforeEach(async () => {
      @Module({
        imports: [
          TypeOrmModule.forRoot(relationOrmConfig),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: TypeOrmRepositoryModule,
                entities: [
                  { key: AUTHOR_ENTITY_TOKEN, entity: AuthorEntityFixture },
                  { key: POST_ENTITY_TOKEN, entity: PostEntityFixture },
                  { key: TAG_ENTITY_TOKEN, entity: TagEntityFixture },
                ],
              },
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
      const { id } = await authorFactory.create({ name: 'Solo' });
      const author = await authorRepo.findOne({ where: Where.eq('id', id) });
      if (!author) throw new Error('fixture precondition failed');
      const deleted = await authorRepo.delete(author);
      expect(deleted.name).toBe('Solo');

      const found = await authorRepo.findOne({
        where: Where.eq('id', author.id),
      });
      expect(found).toBeNull();
    });

    it('should fail when the foreign key has no ON DELETE action', async () => {
      const { id } = await authorFactory.create({ name: 'HasPosts' });
      await postFactory.create({ title: 'Post1', authorId: id });
      const author = await authorRepo.findOne({ where: Where.eq('id', id) });
      if (!author) throw new Error('fixture precondition failed');

      // PostEntityFixture has no onDelete: 'CASCADE' on its FK, so the
      // database rejects the delete.
      await expect(authorRepo.delete(author)).rejects.toThrow(
        foreignKeyFailure('author-entity'),
      );
    });

    it('should fail when a write names a related row that does not exist', async () => {
      await expect(
        postRepo.create({ title: 'Orphan', authorId: 'no-such-author' }),
      ).rejects.toThrow(foreignKeyFailure('post-entity'));
    });
  });
});
