import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { CrudModule } from '../crud.module.js';

import { CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME } from './crud-test.constants.js';
import { PhotoFixture } from './photo/photo.entity.fixture.js';
import { PhotoBodyFallbackModuleFixture } from './photo-body-fallback/photo-body-fallback.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            {
              key: CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME,
              entity: PhotoFixture,
            },
          ],
        },
      ],
    }),
    CrudModule.forRoot({}),
    PhotoBodyFallbackModuleFixture,
  ],
})
export class AppPhotoBodyFallbackModuleFixture {}
