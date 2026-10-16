import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CrudModule } from '../crud.module.js';

import { CRUD_TEST_PHOTO_CCB_SUB_ENTITY_NAME } from './crud-test.constants.js';
import { PhotoFixture } from './photo/photo.entity.fixture.js';
import { PhotoCcbSubModuleFixture } from './photo-ccb-sub/photo-ccb-sub.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [
            { key: CRUD_TEST_PHOTO_CCB_SUB_ENTITY_NAME, entity: PhotoFixture },
          ],
        },
      ],
    }),
    CrudModule.forRoot({}),
    PhotoCcbSubModuleFixture,
  ],
})
export class AppCcbSubModuleFixture {}
