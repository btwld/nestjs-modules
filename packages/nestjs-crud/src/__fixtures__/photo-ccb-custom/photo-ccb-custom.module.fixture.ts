import { Module } from '@nestjs/common';

import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';

import { CRUD_TEST_PHOTO_ENTITY_KEY } from '../crud-test.constants';
import { PhotoTypeOrmCrudAdapterFixture } from '../photo/photo-typeorm-crud.adapter.fixture';
import { PhotoFixture } from '../photo/photo.entity.fixture';

import {
  PhotoCcbCustomControllerFixture,
  PhotoCcbCustomCrudServiceFixture,
  PHOTO_CRUD_SERVICE_TOKEN,
} from './photo-ccb-custom.controller.fixture';

@Module({
  imports: [
    TypeOrmExtModule.forFeature({
      [CRUD_TEST_PHOTO_ENTITY_KEY]: {
        entity: PhotoFixture,
      },
    }),
  ],
  providers: [
    PhotoTypeOrmCrudAdapterFixture,
    {
      provide: PHOTO_CRUD_SERVICE_TOKEN,
      useClass: PhotoCcbCustomCrudServiceFixture,
    },
  ],
  controllers: [PhotoCcbCustomControllerFixture],
})
export class PhotoCcbCustomModuleFixture {}
