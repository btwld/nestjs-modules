import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { CrudModule } from '../crud.module.js';
import { CrudOperationResolver } from '../infrastructure/resolvers/crud-operation.resolver.js';

import { CRUD_TEST_PHOTO_CCB_ENTITY_NAME } from './crud-test.constants.js';
import { PhotoFixture } from './photo/photo.entity.fixture.js';
import { PhotoCcbModuleFixture } from './photo-ccb/photo-ccb.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            { key: CRUD_TEST_PHOTO_CCB_ENTITY_NAME, entity: PhotoFixture },
          ],
        },
      ],
    }),
    CrudModule.forRoot({
      defaultResolver: CrudOperationResolver,
    }),
    PhotoCcbModuleFixture,
  ],
})
export class AppResolverOperationModuleFixture {}
