import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { CrudModule } from '../crud.module.js';
import { CrudOperationResolver } from '../infrastructure/resolvers/crud-operation.resolver.js';

import { CRUD_TEST_PHOTO_CCB_ENTITY_NAME } from './crud-test.constants.js';
import { PhotoFixture } from './photo/photo.entity.fixture.js';
import { buildPhotoCcbFixture } from './photo-ccb/photo-ccb.controller.fixture.js';

// The controller names its resolver; the builder provides it.
const { controllers, providers } = buildPhotoCcbFixture(CrudOperationResolver);

@Module({
  imports: [RepositoryModule.forFeature([CRUD_TEST_PHOTO_CCB_ENTITY_NAME])],
  providers,
  controllers: [controllers.PhotoCcbController],
})
class PhotoCcbOperationModuleFixture {}

@Module({
  imports: [
    RepositoryModule.forRoot({
      adapters: [
        {
          adapter: TypeOrmSqliteRepositoryModule,
          entities: [
            { key: CRUD_TEST_PHOTO_CCB_ENTITY_NAME, entity: PhotoFixture },
          ],
        },
      ],
    }),
    CrudModule.forRoot({}),
    PhotoCcbOperationModuleFixture,
  ],
})
export class AppResolverOperationModuleFixture {}
