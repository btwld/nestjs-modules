import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { CrudModule } from '../crud.module.js';

import { CRUD_TEST_VERSIONED_ENTITY_NAME } from './crud-test.constants.js';
import { VersionedFixture } from './versioned/versioned.entity.fixture.js';
import { VersionedModuleFixture } from './versioned/versioned.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            { key: CRUD_TEST_VERSIONED_ENTITY_NAME, entity: VersionedFixture },
          ],
        },
      ],
    }),
    CrudModule.forRoot({}),
    VersionedModuleFixture,
  ],
})
export class AppVersionedModuleFixture {}
