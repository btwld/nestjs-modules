import { DynamicModule, Module } from '@nestjs/common';

import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';

import { CrudModule } from '../../crud.module';
import { CRUD_TEST_PHOTO_ENTITY_KEY } from '../crud-test.constants';

import { PhotoTypeOrmCrudAdapterFixture } from './photo-typeorm-crud.adapter.fixture';
import { PhotoControllerFixture } from './photo.controller.fixture';
import { PhotoFixture } from './photo.entity.fixture';
import { PhotoServiceFixture } from './photo.service.fixture';

@Module({
  providers: [PhotoTypeOrmCrudAdapterFixture, PhotoServiceFixture],
  controllers: [PhotoControllerFixture],
})
export class PhotoModuleFixture {
  static register(): DynamicModule {
    return {
      module: PhotoModuleFixture,
      imports: [
        CrudModule.forRoot({}),
        TypeOrmExtModule.forFeature({
          [CRUD_TEST_PHOTO_ENTITY_KEY]: {
            entity: PhotoFixture,
          },
        }),
      ],
    };
  }
}
