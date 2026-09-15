import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CRUD_TEST_PHOTO_CCB_SUB_ENTITY_NAME } from '../crud-test.constants.js';
import { PhotoFixture } from '../photo/photo.entity.fixture.js';

import {
  PhotoCcbSubControllerFixture,
  PhotoCcbSubProviders,
} from './photo-ccb-sub.controller.fixture.js';

@Module({
  imports: [
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: CRUD_TEST_PHOTO_CCB_SUB_ENTITY_NAME, entity: PhotoFixture },
      ],
    }),
  ],
  providers: PhotoCcbSubProviders,
  controllers: [PhotoCcbSubControllerFixture],
})
export class PhotoCcbSubModuleFixture {}
