import { DynamicModule, Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CrudModule } from '../../crud.module.js';
import { CRUD_TEST_PHOTO_ENTITY_NAME } from '../crud-test.constants.js';

import { PhotoEntityInterfaceFixture } from './interfaces/photo-entity.interface.fixture.js';
import { PhotoControllerFixture } from './photo.controller.fixture.js';
import { PhotoFixture } from './photo.entity.fixture.js';

@Module({})
export class PhotoModuleFixture {
  static register(): DynamicModule {
    return {
      module: PhotoModuleFixture,
      imports: [
        CrudModule.forRoot({}),
        CrudModule.forFeature<PhotoEntityInterfaceFixture>({
          crud: {
            controller: { class: PhotoControllerFixture },
          },
        }),
        RepositoryModule.forFeature({
          module: TypeOrmRepositoryModule,
          entities: [
            { key: CRUD_TEST_PHOTO_ENTITY_NAME, entity: PhotoFixture },
          ],
        }),
      ],
    };
  }
}
