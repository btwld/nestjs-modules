import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import {
  CRUD_TEST_VERSIONED_ENTITY_NAME,
  CRUD_TEST_VERSIONED_REQUIRED_ENTITY_NAME,
} from '../crud-test.constants.js';

import {
  VersionedRequiredControllerFixture,
  VersionedRequiredProviders,
} from './versioned-required.controller.fixture.js';
import {
  VersionedControllerFixture,
  VersionedProviders,
} from './versioned.controller.fixture.js';
import { VersionedFixture } from './versioned.entity.fixture.js';

@Module({
  imports: [
    // Both keys map to the same TypeORM entity/table — the two controllers
    // are separate routes over identical data, not separate schemas.
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: CRUD_TEST_VERSIONED_ENTITY_NAME, entity: VersionedFixture },
        {
          key: CRUD_TEST_VERSIONED_REQUIRED_ENTITY_NAME,
          entity: VersionedFixture,
        },
      ],
    }),
  ],
  providers: [...VersionedProviders, ...VersionedRequiredProviders],
  controllers: [VersionedControllerFixture, VersionedRequiredControllerFixture],
})
export class VersionedModuleFixture {}
