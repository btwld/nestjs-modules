import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CacheModule } from '../../cache.module.js';

import { UserCacheEntityFixture } from './entities/user-cache-entity.fixture.js';
import { UserEntityFixture } from './entities/user-entity.fixture.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [UserEntityFixture, UserCacheEntityFixture],
    }),
    RepositoryModule.forRoot({}),
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [{ key: 'userCache', entity: UserCacheEntityFixture }],
    }),
    CacheModule.forRoot({}),
    CacheModule.forFeature(['userCache']),
  ],
  controllers: [],
  providers: [],
})
export class AppModuleFixture {}
