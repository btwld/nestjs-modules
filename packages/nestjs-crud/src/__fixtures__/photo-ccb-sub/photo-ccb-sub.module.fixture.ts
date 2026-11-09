import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CRUD_TEST_PHOTO_CCB_SUB_ENTITY_NAME } from '../crud-test.constants.js';

import {
  PhotoCcbSubControllerFixture,
  PhotoCcbSubProviders,
} from './photo-ccb-sub.controller.fixture.js';

@Module({
  imports: [RepositoryModule.forFeature([CRUD_TEST_PHOTO_CCB_SUB_ENTITY_NAME])],
  providers: PhotoCcbSubProviders,
  controllers: [PhotoCcbSubControllerFixture],
})
export class PhotoCcbSubModuleFixture {}
