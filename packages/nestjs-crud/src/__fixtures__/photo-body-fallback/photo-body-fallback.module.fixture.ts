import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME } from '../crud-test.constants.js';
import { PhotoFixture } from '../photo/photo.entity.fixture.js';

import {
  PhotoBodyFallbackControllerFixture,
  PhotoBodyFallbackProviders,
} from './photo-body-fallback.controller.fixture.js';

@Module({
  imports: [
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        {
          key: CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME,
          entity: PhotoFixture,
        },
      ],
    }),
  ],
  providers: PhotoBodyFallbackProviders,
  controllers: [PhotoBodyFallbackControllerFixture],
})
export class PhotoBodyFallbackModuleFixture {}
