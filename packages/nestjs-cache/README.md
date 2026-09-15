# @concepta/nestjs-cache

Database-backed cache module for NestJS using DDD/CQRS. Provides typed cache
entries keyed by `key`, `type`, and `assigneeId` with optional TTL expiration.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-cache)](https://www.npmjs.com/package/@concepta/nestjs-cache)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-cache)](https://www.npmjs.com/package/@concepta/nestjs-cache)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-cache%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [App Context](#app-context)
- [Commands](#commands)
- [Queries](#queries)
- [Domain Events](#domain-events)
- [Cache Aggregate](#cache-aggregate)
- [Expiration Policy](#expiration-policy)
- [Repository](#repository)
- [Schemas](#schemas)
- [Exceptions](#exceptions)
- [HTTP Controller with CRUD Module](#http-controller-with-crud-module)
- [Entry Points](#entry-points)
- [Seeding](#seeding)
- [Environment Variables](#environment-variables)

## Installation

```sh
yarn add @concepta/nestjs-cache @nestjs/common @nestjs/config @nestjs/core
```

This package is **ESM-only** and targets **NestJS 12** on
**Node >= 22.12**.

### Dependencies

`zod` is a direct dependency — request/response shapes are Zod v4
(Standard Schema) schemas.

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS core — install explicitly, no longer bundled |
| `@nestjs/config` | Yes | Module option registration |
| `@nestjs/core` | Yes | Module reference and reflection |
| `@nestjs/cqrs` | No | Optional peer — required in practice for `CommandBus`/`QueryBus`/`EventBus` |
| `typeorm` | No | Only if using the TypeORM repository adapter |
| `@concepta/nestjs-crud` | No | Only if using the HTTP gateway layer |
| `@concepta/typeorm-seeding` | No | Only for database seeding |
| `@faker-js/faker` | No | Only for database seeding |

## Module Registration

### Synchronous

```ts
import { CacheModule } from '@concepta/nestjs-cache';

@Module({
  imports: [
    CacheModule.register({
      settings: {
        expiresIn: '1h',
      },
    }),
  ],
})
export class AppModule {}
```

### Asynchronous

```ts
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => ({
        settings: {
          expiresIn: '1h',
        },
      }),
    }),
  ],
})
export class AppModule {}
```

`register()` / `registerAsync()` register the module **locally** (scoped to
the importing module).

`forRoot()` / `forRootAsync()` register the module **globally**. This is
required when using `forFeature()` in other modules, since `forFeature()`
injects tokens exported by the core module.

### Multi-Tenancy with forFeature

Use `forFeature()` to register dynamic `CacheRepository` providers for each
entity key. This allows different parts of your application to maintain
separate cache tables.

```ts
@Module({
  imports: [
    CacheModule.forFeature(['userCache', 'sessionCache']),
  ],
})
export class UserModule {}
```

Each entity key maps to a `CacheRepository` instance resolved at runtime by
`CacheRepositoryResolver`.

### Options

`forRoot()` and `registerAsync()` accept `CacheOptionsInterface` merged with
`CacheExtrasInterface` (extras are passed to `setExtras` on the
`ConfigurableModuleBuilder`):

```ts
interface CacheExtrasInterface {
  global?: boolean;
  providers?: Provider[];
  repositories?: {
    cache?: Type<CacheRepositoryInterface>;
  };
}

interface CacheOptionsInterface {
  settings?: CacheSettingsInterface;
}

interface CacheSettingsInterface {
  expiresIn?: string | null;
}
```

The `expiresIn` value accepts time span strings (e.g. `'60'`, `'2 days'`,
`'10h'`, `'7d'`). When not provided, entries do not expire.

`forFeature()` accepts an array of entity key strings. Each key creates a
dynamic `CacheRepository` provider:

```ts
CacheModule.forFeature(entityKeys: string[])
```

Pass `repositories.cache` to override the default `CacheRepository` with a
custom implementation.

## Architecture Overview

The module follows a DDD/CQRS architecture with four layers:

```text
Gateway (HTTP)
  |
Application (Commands / Queries)
  |
Domain (Cache aggregate, Events)
  |
Infrastructure (Repository, Mapper, Schemas, Config)
```

- **Domain** -- `Cache` aggregate extending `DomainAggregate<CacheInterface>`,
  domain events
- **Application** -- 7 commands and 3 queries dispatched via `@nestjs/cqrs`
- **Infrastructure** -- `CacheRepository` with ctx-first signatures,
  `CacheMapper` for entity-to-aggregate conversion (DI-injected),
  `CacheRepositoryResolver` for multi-tenancy, Zod schemas
- **Gateway** -- HTTP request handlers bridging `@concepta/nestjs-crud`
  to domain commands

## App Context

Commands, queries, and repository methods accept a `PlainLiteralObject` as
their `ctx` argument. This context is threaded through the transaction scope
and repository layer automatically. In HTTP contexts the gateway provides
the context; for programmatic use, pass any plain object:

```ts
const cache = await this.commandBus.execute<CreateCacheCommand, Cache>(
  new CreateCacheCommand({}, 'userCache', dto),
);
```

## Context Overlay

The cache module uses a context overlay to resolve the entity namespace for
each HTTP request. This is required when using the CRUD gateway.

### CacheNamespace Decorator

Apply `@CacheNamespace({ name })` to a controller (or via `extraDecorators`
on a generated CRUD controller) to associate it with a cache entity key:

```ts
import { CacheNamespace } from '@concepta/nestjs-cache';

// For generated CRUD controllers, pass via extraDecorators:
CrudModule.forFeature<CacheInterface>({
  crud: {
    controller: {
      entity: 'userCache',
      path: 'cache/user',
      extraDecorators: [CacheNamespace({ name: 'userCache' })],
      // ...
    },
  },
})
```

### How It Works

1. `CacheContextOverlay` reads `@CacheNamespace` metadata via `Reflector`
2. `CacheContextOverlay` extends `ContextOverlayInterceptor` and is registered
   as a global `APP_INTERCEPTOR`. Its `attach()` method resolves
   the namespace and calls `ctx.defineOverlay(CacheCtx, resolved)`
3. Gateway request handlers use `@Ctx(CacheCtx)` (or `ctx.with(CacheCtx)`)
   to get `{ namespace }`, used as the entity key for repository resolution

## Commands

| Command | Description |
| --- | --- |
| `CreateCacheCommand` | `(ctx, namespace, dto)` -- Create a new cache entry |
| `UpdateCacheCommand` | `(ctx, namespace, id, dto)` -- Partial update (data and expiresIn) |
| `ReplaceCacheCommand` | `(ctx, namespace, id, dto)` -- Full replacement (creates if ID not found) |
| `UpsertCacheCommand` | `(ctx, namespace, dto)` -- Create or update by key/type/assigneeId |
| `RemoveCacheCommand` | `(ctx, namespace, id)` -- Hard delete by ID |
| `ArchiveCacheCommand` | `(ctx, namespace, id)` -- Soft delete by ID |
| `ClearCachesByAssigneeCommand` | `(ctx, namespace, assigneeId)` -- Remove all entries for an assignee |

### Dispatching a Command

```ts
import { CommandBus } from '@nestjs/cqrs';
import { CreateCacheCommand, Cache } from '@concepta/nestjs-cache';

const cache = await this.commandBus.execute<CreateCacheCommand, Cache>(
  new CreateCacheCommand(ctx, 'userCache', {
    key: 'dashboard-filter',
    type: 'user-preference',
    assigneeId: userId,
    data: JSON.stringify(filterState),
    expiresIn: '7d',
  }),
);
```

## Queries

| Query | Description |
| --- | --- |
| `GetCacheQuery` | `(ctx, namespace, id)` -- Get by ID (throws `CacheNotFoundException`) |
| `FindOneCacheQuery` | `(ctx, namespace, key, type, assigneeId)` -- Find by key/type/assigneeId (returns null) |
| `FindCachesByAssigneeQuery` | `(ctx, namespace, assigneeId)` -- Find all entries for an assigneeId |

### Dispatching a Query

```ts
import { QueryBus } from '@nestjs/cqrs';
import { FindOneCacheQuery, Cache } from '@concepta/nestjs-cache';

const cache = await this.queryBus.execute<FindOneCacheQuery, Cache | null>(
  new FindOneCacheQuery(ctx, 'userCache', 'dashboard-filter', 'user-preference', userId),
);
```

## Domain Events

All events carry an `eventContext` and a plain `CacheInterface` snapshot.

| Event | Emitted When |
| --- | --- |
| `CacheCreatedEvent` | New cache entry created |
| `CacheUpdatedEvent` | Cache data updated |
| `CacheReplacedEvent` | Cache fully replaced |
| `CacheExtendedEvent` | Cache expiration extended |

### Handling an Event

```ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CacheCreatedEvent } from '@concepta/nestjs-cache';

@EventsHandler(CacheCreatedEvent)
export class CacheCreatedListener implements IEventHandler<CacheCreatedEvent> {
  handle(event: CacheCreatedEvent): void {
    const { eventContext, cache } = event;
    // react to cache creation
  }
}
```

## Cache Aggregate

The `Cache` class extends `DomainAggregate<CacheInterface>` and encapsulates
all cache domain logic.

### Factory Methods

```ts
// Create with auto-generated UUID
const cache = Cache.create(eventContext, dto, expirationDate);

// Create with a specific ID
const cache = Cache.createWithId(eventContext, id, dto, expirationDate);
```

Reconstitution from a database entity is handled by `CacheMapper` (see
[Repository](#repository)).

### Operations

```ts
// Replace all fields (preserves id and dateCreated)
cache.replace(eventContext, dto, expirationDate);

// Update only the data field
cache.updateData(eventContext, newData);

// Extend expiration
cache.extend(eventContext, expirationDate);

// Convert to plain CacheInterface object (inherited from DomainAggregate)
const plain = cache.toPlain();
```

## Expiration Policy

`CacheExpirationPolicy` (exported with its `CacheExpirationSettings`
interface) converts `expiresIn` time spans into concrete expiration dates.
It is provided in DI from the module settings, so the module's default
`expiresIn` is used when a request does not supply one.

```ts
interface CacheExpirationSettings {
  expiresIn?: string | null;
}

class CacheExpirationPolicy {
  constructor(settings?: CacheExpirationSettings);
  get defaultExpiresIn(): string | null;
  resolveExpirationDate(expiresIn?: string | null): Date | null;
}
```

`resolveExpirationDate()` resolves the given time span (falling back to the
default) into a `Date`, or `null` when no expiration applies. An invalid
time span throws `CacheInvalidExpiredDateException`.

## Repository

`CacheRepository` uses a ctx-first calling convention for multi-tenancy
support. All methods take `PlainLiteralObject` as the first argument.

The repository receives a DI-injected `CacheMapper` that converts database
entities to `Cache` aggregates via `toDomain()` and aggregates back to
persistence form via `toPersistence()`.

| Method | Signature |
| --- | --- |
| `get` | `(ctx, id) => Promise<Cache \| null>` |
| `findOne` | `(ctx, { key, type, assigneeId }) => Promise<Cache \| null>` |
| `findAllByAssignee` | `(ctx, assigneeId) => Promise<Cache[]>` |
| `save` | `(ctx, cache) => Promise<void>` |
| `remove` | `(ctx, cache) => Promise<void>` |
| `removeAllByAssignee` | `(ctx, assigneeId) => Promise<void>` |
| `softRemove` | `(ctx, cache) => Promise<void>` |

### Repository Resolution

```ts
const cacheRepo = this.repositoryResolver.resolve(ctx.entity);
const cache = await cacheRepo.get(ctx, id);
```

`CacheRepositoryResolver` looks up the repository by entity key. Entity keys
are registered via `CacheModule.forFeature()`.

## Schemas

Request and response shapes are Zod v4 (Standard Schema) schemas.

| Schema | Entry Point | Fields |
| --- | --- | --- |
| `cacheCreateSchema` | main | key, type, assigneeId, data (optional, nullable), expiresIn (optional, nullable) |
| `cacheUpdateSchema` | main | data (optional, nullable), expiresIn (optional, nullable) |
| `cacheSchema` | main | Full entity response (key, type, data, assigneeId, expirationDate, + common entity fields) |
| `cachePaginatedSchema` | `optional/crud` | Paginated envelope wrapping `cacheSchema` |

The `expiresIn` field accepts time span strings: `'60'`, `'2 days'`, `'10h'`,
`'7d'`.

`expiresIn` is request-only: the response schema `cacheSchema` intentionally
omits it. The domain converts `expiresIn` into the computed `expirationDate`,
which is what persisted entities and responses carry.

## Exceptions

| Exception | Description |
| --- | --- |
| `CacheNotFoundException` | Cache ID not found (HTTP 404) |
| `CacheEntityNotFoundException` | Entity key not registered via `forFeature()` |
| `CacheInvalidExpiredDateException` | Invalid `expiresIn` format (HTTP 400) |
| `CacheException` | Base cache exception |

## HTTP Controller with CRUD Module

Use `@concepta/nestjs-crud` to expose cache operations as REST endpoints. The
gateway request/handler classes are exported from
`@concepta/nestjs-cache/optional/crud`.

The CRUD gateway needs the surrounding modules registered as well:
`CqrsModule.forRoot()`, `CrudModule.forRoot()` (with `CrudCqrsResolver` as
the default resolver), `CoreModule.forRoot()` (context overlays), and a
`RepositoryModule.forFeature()` mapping the entity key to your cache entity
class.

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CoreModule, Operation } from '@concepta/nestjs-core';
import { CrudCqrsResolver, CrudModule } from '@concepta/nestjs-crud';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';
import {
  CacheInterface,
  CacheModule,
  CacheNamespace,
  cacheCreateSchema,
  cacheUpdateSchema,
  cacheSchema,
} from '@concepta/nestjs-cache';
import {
  cachePaginatedSchema,
  CreateCacheRequest,
  CreateCacheRequestHandler,
  UpdateCacheRequest,
  UpdateCacheRequestHandler,
  ReplaceCacheRequest,
  ReplaceCacheRequestHandler,
  DeleteCacheRequest,
  DeleteCacheRequestHandler,
  ListCachesRequest,
  ListCachesRequestHandler,
  ReadCacheRequest,
  ReadCacheRequestHandler,
} from '@concepta/nestjs-cache/optional/crud';

@Module({
  imports: [
    CqrsModule.forRoot(),
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({
      defaultResolver: CrudCqrsResolver,
    }),
    CoreModule.forRoot(),
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [{ key: 'userCache', entity: UserCacheEntity }],
    }),
    CacheModule.forFeature(['userCache']),
    CrudModule.forFeature<CacheInterface>({
      crud: {
        controller: {
          entity: 'userCache',
          path: 'cache/user',
          resolver: CrudCqrsResolver,
          transactional: true,
          extraDecorators: [CacheNamespace({ name: 'userCache' })],
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
})
export class UserCacheModule {}
```

This registers a CRUD controller at `/cache/user` with List, Read, Create,
Update, Replace, and Delete operations. The `CrudCqrsResolver` bridges HTTP
requests to domain commands and queries via the CQRS bus. Set `transactional:
true` to wrap each operation in a database transaction.

`CacheModule.forRoot()` (or `forRootAsync()`) must be registered globally
in a parent module for `forFeature()` to resolve its dependencies.

This is a minimal example. `CrudModule.forFeature()` supports additional
options including custom resolvers, route guards, schema-based per-operation
serialization overrides, and per-operation request overrides. See the
`@concepta/nestjs-crud` documentation for the full API.

### OpenAPI

Create the swagger document with the `standardSchemaConverter` from
`@concepta/nestjs-core`:

```ts
SwaggerModule.createDocument(app, config, { standardSchemaConverter });
```

The cache schemas register as bare OpenAPI component ids: `Cache`
(`cacheSchema`) and `CachePaginated` (`cachePaginatedSchema`). Request body
schemas are documented inline.

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-cache` | Module, aggregate, commands, queries, events, handlers, schemas, expiration policy, repository, exceptions, domain interfaces |
| `@concepta/nestjs-cache/optional/crud` | CRUD request/handler classes, paginated schema |
| `@concepta/nestjs-cache/optional/typeorm` | `CacheSqliteEntity`, `CachePostgresEntity` |
| `@concepta/nestjs-cache/optional/seeding` | `CacheFactory` |

## Seeding

A `CacheFactory` is available for test seeding:

```ts
import { CacheFactory } from '@concepta/nestjs-cache/optional/seeding';
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `CACHE_EXPIRE_IN` | `null` | Default expiration time span for cache entries |
