import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CrudModule } from '../crud.module.js';

import { CRUD_TEST_VERSIONED_ENTITY_NAME } from './crud-test.constants.js';
import { VersionedFixture } from './versioned/versioned.entity.fixture.js';
import { VersionedModuleFixture } from './versioned/versioned.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
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
