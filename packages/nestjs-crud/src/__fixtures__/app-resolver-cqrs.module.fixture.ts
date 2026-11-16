import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { CrudModule } from '../crud.module.js';
import { CrudCqrsResolver } from '../infrastructure/resolvers/crud-cqrs.resolver.js';

import { CRUD_TEST_PHOTO_CCB_ENTITY_NAME } from './crud-test.constants.js';
import { PhotoFixture } from './photo/photo.entity.fixture.js';
import { buildPhotoCcbFixture } from './photo-ccb/photo-ccb.controller.fixture.js';

// The controller names its resolver; the builder provides it.
const { controllers, providers } = buildPhotoCcbFixture(CrudCqrsResolver);

@Module({
  imports: [RepositoryModule.forFeature([CRUD_TEST_PHOTO_CCB_ENTITY_NAME])],
  providers,
  controllers: [controllers.PhotoCcbController],
})
class PhotoCcbCqrsModuleFixture {}

@Module({
  imports: [
    RepositoryModule.forRoot({
      adapters: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            { key: CRUD_TEST_PHOTO_CCB_ENTITY_NAME, entity: PhotoFixture },
          ],
        },
      ],
    }),
    CqrsModule.forRoot(),
    CrudModule.forRoot({}),
    PhotoCcbCqrsModuleFixture,
  ],
})
export class AppResolverCqrsModuleFixture {}
