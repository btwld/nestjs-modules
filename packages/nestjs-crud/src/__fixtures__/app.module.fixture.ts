import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CRUD_TEST_PHOTO_ENTITY_NAME } from './crud-test.constants.js';
import { PhotoFixture } from './photo/photo.entity.fixture.js';
import { PhotoModuleFixture } from './photo/photo.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [
            { key: CRUD_TEST_PHOTO_ENTITY_NAME, entity: PhotoFixture },
          ],
        },
      ],
    }),
    PhotoModuleFixture.register(),
  ],
})
export class AppModuleFixture {}
