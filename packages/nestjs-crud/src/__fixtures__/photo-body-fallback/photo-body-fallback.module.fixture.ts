import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME } from '../crud-test.constants.js';

import {
  PhotoBodyFallbackControllerFixture,
  PhotoBodyFallbackProviders,
} from './photo-body-fallback.controller.fixture.js';

@Module({
  imports: [
    RepositoryModule.forFeature([CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME]),
  ],
  providers: PhotoBodyFallbackProviders,
  controllers: [PhotoBodyFallbackControllerFixture],
})
export class PhotoBodyFallbackModuleFixture {}
