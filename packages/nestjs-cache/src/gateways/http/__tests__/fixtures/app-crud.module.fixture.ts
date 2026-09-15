import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule, Operation } from '@concepta/nestjs-core';
import { CrudCqrsResolver, CrudModule } from '@concepta/nestjs-crud';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { UserCacheEntityFixture } from '../../../../__tests__/fixtures/entities/user-cache-entity.fixture.js';
import { UserEntityFixture } from '../../../../__tests__/fixtures/entities/user-entity.fixture.js';
import { CACHE_MODULE_CACHE_ENTITY_KEY } from '../../../../cache.constants.js';
import { CacheModule } from '../../../../cache.module.js';
import { CacheInterface } from '../../../../domain/interfaces/cache.interface.js';
import { CacheNamespace } from '../../../../gateways/decorators/cache-namespace.decorator.js';
import { cacheCreateSchema } from '../../../../infrastructure/schemas/cache-create.schema.js';
import { cachePaginatedSchema } from '../../../../infrastructure/schemas/cache-paginated.schema.js';
import { cacheUpdateSchema } from '../../../../infrastructure/schemas/cache-update.schema.js';
import { cacheSchema } from '../../../../infrastructure/schemas/cache.schema.js';
import { CreateCacheRequestHandler } from '../../commands/handlers/create-cache-request.handler.js';
import { DeleteCacheRequestHandler } from '../../commands/handlers/delete-cache-request.handler.js';
import { ReplaceCacheRequestHandler } from '../../commands/handlers/replace-cache-request.handler.js';
import { UpdateCacheRequestHandler } from '../../commands/handlers/update-cache-request.handler.js';
import { CreateCacheRequest } from '../../commands/impl/create-cache.request.js';
import { DeleteCacheRequest } from '../../commands/impl/delete-cache.request.js';
import { ReplaceCacheRequest } from '../../commands/impl/replace-cache.request.js';
import { UpdateCacheRequest } from '../../commands/impl/update-cache.request.js';
import { ListCachesRequestHandler } from '../../queries/handlers/list-caches-request.handler.js';
import { ReadCacheRequestHandler } from '../../queries/handlers/read-cache-request.handler.js';
import { ListCachesRequest } from '../../queries/impl/list-caches.request.js';
import { ReadCacheRequest } from '../../queries/impl/read-cache.request.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [UserEntityFixture, UserCacheEntityFixture],
    }),
    CqrsModule.forRoot(),
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({
      defaultResolver: CrudCqrsResolver,
    }),
    CoreModule.forRoot(),
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: CACHE_MODULE_CACHE_ENTITY_KEY, entity: UserCacheEntityFixture },
      ],
    }),
    CacheModule.forRoot({
      settings: {
        expiresIn: '1h',
      },
    }),
    CacheModule.forFeature([CACHE_MODULE_CACHE_ENTITY_KEY]),
    CrudModule.forFeature<CacheInterface>({
      crud: {
        controller: {
          entity: CACHE_MODULE_CACHE_ENTITY_KEY,
          path: 'cache/user',
          resolver: CrudCqrsResolver,
          transactional: true,
          extraDecorators: [
            CacheNamespace({ name: CACHE_MODULE_CACHE_ENTITY_KEY }),
          ],
          request: { body: cacheCreateSchema },
          response: {
            resource: cacheSchema,
            paginated: cachePaginatedSchema,
          },
        },
        operations: [
          {
            operation: Operation.List,
            query: ListCachesRequest,
            queryHandler: ListCachesRequestHandler,
          },
          {
            operation: Operation.Read,
            query: ReadCacheRequest,
            queryHandler: ReadCacheRequestHandler,
          },
          {
            operation: Operation.Create,
            request: { body: cacheCreateSchema },
            command: CreateCacheRequest,
            commandHandler: CreateCacheRequestHandler,
          },
          {
            operation: Operation.Update,
            request: { body: cacheUpdateSchema },
            command: UpdateCacheRequest,
            commandHandler: UpdateCacheRequestHandler,
          },
          {
            operation: Operation.Replace,
            request: { body: cacheCreateSchema },
            command: ReplaceCacheRequest,
            commandHandler: ReplaceCacheRequestHandler,
          },
          {
            operation: Operation.Delete,
            command: DeleteCacheRequest,
            commandHandler: DeleteCacheRequestHandler,
          },
        ],
      },
    }),
  ],
  providers: [],
})
export class AppCrudModuleFixture {}
