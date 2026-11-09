import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';

import { relationOrmConfig } from '../../__fixtures__/repository/config/relation-ormconfig.fixture.js';
import {
  AUTHOR_ENTITY_TOKEN,
  POST_ENTITY_TOKEN,
  PROFILE_ENTITY_TOKEN,
  TAG_ENTITY_TOKEN,
} from '../../__fixtures__/repository/config/relation.constants.fixture.js';
import { AuthorEntityFixture } from '../../__fixtures__/repository/entity/author.entity.fixture.js';
import { PostEntityFixture } from '../../__fixtures__/repository/entity/post.entity.fixture.js';
import { ProfileEntityFixture } from '../../__fixtures__/repository/entity/profile.entity.fixture.js';
import { TagEntityFixture } from '../../__fixtures__/repository/entity/tag.entity.fixture.js';
import { TypeOrmSqliteRepositoryModule } from '../../sqlite/typeorm-sqlite-repository.module.js';

describe('TypeOrmRepository on a data source that loads relations by query', () => {
  let moduleFixture: TestingModule;
  let authors: RepositoryInterface<AuthorEntityFixture>;
  let posts: RepositoryInterface<PostEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...relationOrmConfig,
          relationLoadStrategy: 'query',
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmSqliteRepositoryModule,
              entities: [
                { key: AUTHOR_ENTITY_TOKEN, entity: AuthorEntityFixture },
                { key: POST_ENTITY_TOKEN, entity: PostEntityFixture },
                { key: TAG_ENTITY_TOKEN, entity: TagEntityFixture },
                { key: PROFILE_ENTITY_TOKEN, entity: ProfileEntityFixture },
              ],
            },
          ],
        }),
      ],
    }).compile();
    authors = moduleFixture.get(getDynamicRepositoryToken(AUTHOR_ENTITY_TOKEN));
    posts = moduleFixture.get(getDynamicRepositoryToken(POST_ENTITY_TOKEN));
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  it('joins in one read, so a filter on a joined column narrows the joined rows', async () => {
    const author = await authors.create({ name: 'Ada' });
    await posts.createMany([
      { title: 'kept', authorId: author.id },
      { title: 'other', authorId: author.id },
    ]);

    const [found] = await authors.find({
      join: [{ relation: 'posts' }],
      where: Where.rel('posts', Where.eq('title', 'kept')),
    });

    expect(found?.posts.map(({ title }) => title)).toEqual(['kept']);
  });
});
