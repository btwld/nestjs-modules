import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhotoTypeOrmCrudAdapterFixture } from '../photo/photo-typeorm-crud.adapter.fixture';
import { PhotoFixture } from '../photo/photo.entity.fixture';

import {
  PhotoCcbCustomControllerFixture,
  PhotoCcbCustomCrudServiceFixture,
  PHOTO_CRUD_SERVICE_TOKEN,
} from './photo-ccb-custom.controller.fixture';

@Module({
  imports: [TypeOrmModule.forFeature([PhotoFixture])],
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
