import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CRUD_TEST_VERSIONED_ENTITY_NAME } from '../crud-test.constants.js';

import {
  VersionedRequiredControllerFixture,
  VersionedRequiredProviders,
} from './versioned-required.controller.fixture.js';
import {
  VersionedControllerFixture,
  VersionedProviders,
} from './versioned.controller.fixture.js';

@Module({
  imports: [
    // Both controllers serve this one repository, as separate routes.
    RepositoryModule.forFeature([CRUD_TEST_VERSIONED_ENTITY_NAME]),
  ],
  providers: [...VersionedProviders, ...VersionedRequiredProviders],
  controllers: [VersionedControllerFixture, VersionedRequiredControllerFixture],
})
export class VersionedModuleFixture {}
