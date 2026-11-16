import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { CRUD_TEST_PHOTO_CCB_CUSTOM_ENTITY_NAME } from '../crud-test.constants.js';

import {
  PhotoCcbCustomControllerFixture,
  PhotoCcbCustomProviders,
} from './photo-ccb-custom.controller.fixture.js';

@Module({
  imports: [
    RepositoryModule.forFeature([CRUD_TEST_PHOTO_CCB_CUSTOM_ENTITY_NAME]),
  ],
  providers: PhotoCcbCustomProviders,
  controllers: [PhotoCcbCustomControllerFixture],
})
export class PhotoCcbCustomModuleFixture {}
