import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhotoTypeOrmCrudAdapterFixture } from '../photo/photo-typeorm-crud.adapter.fixture';
import { PhotoFixture } from '../photo/photo.entity.fixture';

import {
  PhotoCcbSubControllerFixture,
  PhotoCcbSubCrudServiceFixture,
  PHOTO_CRUD_SERVICE_TOKEN,
} from './photo-ccb-sub.controller.fixture';

@Module({
  imports: [TypeOrmModule.forFeature([PhotoFixture])],
  providers: [
    PhotoTypeOrmCrudAdapterFixture,
    {
      provide: PHOTO_CRUD_SERVICE_TOKEN,
      useClass: PhotoCcbSubCrudServiceFixture,
    },
  ],
  controllers: [PhotoCcbSubControllerFixture],
})
export class PhotoCcbSubModuleFixture {}
