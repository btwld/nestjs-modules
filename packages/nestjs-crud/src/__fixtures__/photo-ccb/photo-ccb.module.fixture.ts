import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhotoTypeOrmCrudAdapterFixture } from '../photo/photo-typeorm-crud.adapter.fixture';
import { PhotoFixture } from '../photo/photo.entity.fixture';

import {
  PhotoCcbControllerFixture,
  PhotoCcbCrudServiceFixture,
  PHOTO_CRUD_ADAPTER_TOKEN,
} from './photo-ccb.controller.fixture';

@Module({
  imports: [TypeOrmModule.forFeature([PhotoFixture])],
  providers: [
    PhotoTypeOrmCrudAdapterFixture,
    {
      provide: PHOTO_CRUD_ADAPTER_TOKEN,
      useClass: PhotoCcbCrudServiceFixture,
    },
  ],
  controllers: [PhotoCcbControllerFixture],
})
export class PhotoCcbModuleFixture {}
