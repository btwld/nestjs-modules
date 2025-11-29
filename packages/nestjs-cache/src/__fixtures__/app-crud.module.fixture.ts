import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExceptionsFilter } from '@concepta/nestjs-common';
import { CrudModule } from '@concepta/nestjs-crud';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';

import { CACHE_MODULE_CACHE_ENTITY_KEY } from '../cache.constants';

import { CacheCrudControllerFixture } from './cache-crud.controller.fixture';
import { CacheCrudServiceFixture } from './cache-crud.service.fixture';
import { CacheTypeOrmCrudAdapterFixture } from './cache-typeorm-crud.adapter.fixture';
import { UserCacheEntityFixture } from './entities/user-cache-entity.fixture';
import { UserEntityFixture } from './entities/user-entity.fixture';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [UserEntityFixture, UserCacheEntityFixture],
    }),
    TypeOrmExtModule.forFeature({
      [CACHE_MODULE_CACHE_ENTITY_KEY]: {
        entity: UserCacheEntityFixture,
      },
    }),
    CrudModule.forRoot({}),
  ],
  controllers: [CacheCrudControllerFixture],
  providers: [
    CacheTypeOrmCrudAdapterFixture,
    CacheCrudServiceFixture,
    {
      provide: APP_FILTER,
      useClass: ExceptionsFilter,
    },
  ],
})
export class AppCrudModuleFixture {}
