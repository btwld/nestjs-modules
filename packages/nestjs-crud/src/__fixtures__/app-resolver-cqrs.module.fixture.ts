import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CrudModule } from '../crud.module.js';
import { CrudCqrsResolver } from '../infrastructure/resolvers/crud-cqrs.resolver.js';

import { CRUD_TEST_PHOTO_CCB_ENTITY_NAME } from './crud-test.constants.js';
import { PhotoFixture } from './photo/photo.entity.fixture.js';
import { PhotoCcbModuleFixture } from './photo-ccb/photo-ccb.module.fixture.js';

@Module({
  imports: [
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [
            { key: CRUD_TEST_PHOTO_CCB_ENTITY_NAME, entity: PhotoFixture },
          ],
        },
      ],
    }),
    CqrsModule.forRoot(),
    CrudModule.forRoot({
      defaultResolver: CrudCqrsResolver,
    }),
    PhotoCcbModuleFixture,
  ],
})
export class AppResolverCqrsModuleFixture {}
