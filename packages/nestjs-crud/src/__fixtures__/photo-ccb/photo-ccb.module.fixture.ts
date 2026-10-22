import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CRUD_TEST_PHOTO_CCB_ENTITY_NAME } from '../crud-test.constants.js';

import {
  PhotoCcbControllerFixture,
  PhotoCcbProviders,
} from './photo-ccb.controller.fixture.js';

@Module({
  imports: [RepositoryModule.forFeature([CRUD_TEST_PHOTO_CCB_ENTITY_NAME])],
  providers: PhotoCcbProviders,
  controllers: [PhotoCcbControllerFixture],
})
export class PhotoCcbModuleFixture {}
