import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { TypeOrmRepositoryModule } from '../../../typeorm-repository.module.js';
import { relationOrmConfig } from '../config/relation-ormconfig.fixture.js';
import {
  AUTHOR_ENTITY_TOKEN,
  COMMENT_ENTITY_TOKEN,
  DOC_ENTITY_TOKEN,
  EAGER_COMMENT_ENTITY_TOKEN,
  POST_ENTITY_TOKEN,
  PROFILE_ENTITY_TOKEN,
  TAG_ENTITY_TOKEN,
} from '../config/relation.constants.fixture.js';
import { AuthorEntityFixture } from '../entity/author.entity.fixture.js';
import { CommentEntityFixture } from '../entity/comment.entity.fixture.js';
import { DocEntityFixture } from '../entity/doc.entity.fixture.js';
import { PostEntityFixture } from '../entity/post.entity.fixture.js';
import { ProfileEntityFixture } from '../entity/profile.entity.fixture.js';
import { TagEntityFixture } from '../entity/tag.entity.fixture.js';

/**
 * The comment repositories are built by the driver alone, outside
 * `RepositoryModule.forRoot()`: the comment fixture pins how the driver
 * reports shapes the repository refuses at startup, and one table is read
 * through two repositories. Neither is bound, so a spec binds both itself,
 * opting the eager one in.
 */
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
            { key: DOC_ENTITY_TOKEN, entity: DocEntityFixture },
            { key: PROFILE_ENTITY_TOKEN, entity: ProfileEntityFixture },
          ],
        },
      ],
    }),
    TypeOrmRepositoryModule.register([
      { key: COMMENT_ENTITY_TOKEN, entity: CommentEntityFixture },
      { key: EAGER_COMMENT_ENTITY_TOKEN, entity: CommentEntityFixture },
    ]),
  ],
})
export class RelationAppModuleFixture {}
