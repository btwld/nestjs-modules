# @concepta/nestjs-crud

Decorator-driven CRUD module for NestJS. Generates REST endpoints from
configuration, with per-method option customization and three controller
build modes: fully generated, pre-decorated, and hybrid.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-crud)](https://www.npmjs.com/package/@concepta/nestjs-crud)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-crud)](https://www.npmjs.com/package/@concepta/nestjs-crud)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-crud%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [Controller Build Modes](#controller-build-modes)
- [Operation Decorators](#operation-decorators)
- [Route Option Decorators](#route-option-decorators)
- [Query String Parameters](#query-string-parameters)
- [Paginated Response](#paginated-response)
- [Serialization and Validation](#serialization-and-validation)
- [OpenAPI Documents](#openapi-documents)
- [Resolvers](#resolvers)
- [CQRS Integration](#cqrs-integration)
- [Specifications and Hooks](#specifications-and-hooks)
- [Exceptions](#exceptions)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-crud
# required peers
yarn add @nestjs/common @nestjs/config @nestjs/core @nestjs/swagger rxjs
```

This package is **ESM-only** and targets **NestJS 12** on
**Node >= 22.12**. Request and response shapes are defined with **Zod v4**
schemas (Standard Schema) — `zod` is a direct dependency.

### Dependencies

| Package | Notes |
| --- | --- |
| `@concepta/nestjs-core` | Core interfaces, utilities, schema helpers, and hook system |
| `@concepta/nestjs-repository` | Repository abstraction layer |
| `@standard-schema/spec` | Standard Schema types |
| `deepmerge` | Option merging |
| `qs` | Query-string parsing |
| `zod` | Schema validation and serialization (Standard Schema) |

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS core — install explicitly, no longer bundled |
| `@nestjs/core` | Yes | Module reference and reflection — install explicitly |
| `@nestjs/config` | Yes | Module option registration via `registerAs` |
| `@nestjs/swagger` | Yes | OpenAPI decorator support — install explicitly |
| `rxjs` | Yes | Interceptor pipeline |
| `@concepta/nestjs-repository-typeorm` | No | TypeORM repository driver |
| `@nestjs/cqrs` | No | Optional peer — only when using `CrudCqrsResolver` |

## Quick Start

Define an entity, Zod schemas, and register a fully generated CRUD endpoint.

### Entity

```ts
import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';

@Entity()
export class PhotoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ default: 0 })
  views!: number;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;
}
```

### Schemas

Request and response shapes are Zod schemas. Helpers from
`@concepta/nestjs-core`:

- `conformsTo<Interface>()(schema)` — pins a schema to a TypeScript interface
  at compile time (no runtime effect)
- `withNamedComponent(schema, id)` — registers the schema as a named OpenAPI
  component (bare component id, e.g. `Photo`)
- `withOpenApi(schema)` — enables OpenAPI JSON schema output for schemas
  documented inline (typically request bodies)

```ts
import { z } from 'zod';
import {
  conformsTo,
  referenceIdSchema,
  withNamedComponent,
  withOpenApi,
} from '@concepta/nestjs-core';
import { paginatedSchema } from '@concepta/nestjs-crud';

export const photoSchema = withNamedComponent(
  conformsTo<PhotoEntity>()(
    referenceIdSchema.extend({
      name: z.string(),
      description: z.string(),
      views: z.number(),
      deletedAt: z.date().nullable(),
    }),
  ),
  'Photo',
);

export const photoCreateSchema = withOpenApi(
  photoSchema.pick({
    name: true,
    description: true,
  }),
);

export const photoUpdateSchema = withOpenApi(
  photoSchema.pick({
    name: true,
    description: true,
    views: true,
  }),
);

export const photoPaginatedSchema = withNamedComponent(
  paginatedSchema(photoSchema),
  'PhotoPaginated',
);
```

### Feature Module

```ts
import { Module } from '@nestjs/common';
import { Operation } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';
import { CrudModule } from '@concepta/nestjs-crud';

@Module({
  imports: [
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [{ key: 'photo', entity: PhotoEntity }],
    }),
    CrudModule.forFeature<PhotoEntity>({
      crud: {
        controller: {
          path: 'photos',
          entity: 'photo',
          request: { body: photoSchema },
          response: {
            resource: photoSchema,
            paginated: photoPaginatedSchema,
          },
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.Read },
          { operation: Operation.Create, request: { body: photoCreateSchema } },
          { operation: Operation.Update },
          { operation: Operation.Delete },
        ],
      },
    }),
  ],
})
export class PhotoModule {}
```

### App Module

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { CrudModule } from '@concepta/nestjs-crud';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({}),
    PhotoModule,
  ],
})
export class AppModule {}
```

### Generated Endpoints

| Method | Path | Operation |
| --- | --- | --- |
| GET | `/photos` | List (paginated) |
| GET | `/photos/:id` | Read |
| POST | `/photos` | Create |
| PATCH | `/photos/:id` | Update |
| DELETE | `/photos/:id` | Delete |

## Module Registration

### forRoot / forRootAsync

Global registration. Required once per application.

```ts
CrudModule.forRoot({})

// Async with factory
CrudModule.forRootAsync({
  useFactory: async () => ({}),
})
```

### forFeature

Per-entity registration. Generates a controller, adapter provider, and
(optionally) CQRS query/command handlers from the configuration object.

```ts
CrudModule.forFeature<PhotoEntity>({
  crud: {
    controller: {
      path: 'photos',
      entity: 'photo',
      request: {
        body: photoSchema,
        params: {
          id: { field: 'id', type: 'uuid', primary: true },
        },
      },
      response: { resource: photoSchema, paginated: photoPaginatedSchema },
    },
    operations: [
      { operation: Operation.List },
      { operation: Operation.Read },
      { operation: Operation.Create, request: { body: photoCreateSchema } },
      { operation: Operation.Update, request: { body: photoUpdateSchema } },
      { operation: Operation.Delete },
      { operation: Operation.SoftDelete, path: 'soft/:id' },
      { operation: Operation.Restore, path: 'restore/:id' },
    ],
  },
})
```

Per-operation `request.body` schemas override the controller-level schema —
for example, a stricter create schema is enforced only on the Create route
while other operations keep the controller default.

### register / registerAsync

Non-global variants of `forRoot`. Identical options, scoped to the importing
module.

## Architecture Overview

```text
HTTP Request
  |
Controller (generated or hand-written)
  |  @CrudController + @CrudList / @CrudCreate / ...
  |
CrudContextOverlay
  |  Parses params, query string into CrudContextInterface
  |
CrudResolver (dispatches operation)
  |
  +-- CrudAdapterResolver  (direct adapter call — default)
  +-- CrudOperationResolver (handler call, no CQRS bus)
  +-- CrudCqrsResolver      (QueryBus / CommandBus)
  |
CrudAdapter
  |  Wraps RepositoryInterface for CRUD semantics
  |
RepositoryAdapter (@concepta/nestjs-repository)
  |
Database Driver (TypeORM, etc.)
```

- **Controller** — Decorated class with operation methods. Can be fully
  generated, hand-written, or a hybrid of both.
- **CrudContextOverlay** — Parses the HTTP request into a
  `CrudContextInterface` (entity name, route params, query string, options)
  and defines it as an overlay on the request context.
- **Resolver** — Dispatches the operation to the adapter directly, through
  a handler, or through the CQRS bus.
- **CrudAdapter** — Wraps a `RepositoryInterface` and adds pagination,
  field filtering, where-clause building, and entity preparation.

### CRUD Context

`CrudContextOverlay` defines the parsed CRUD context as an overlay on the
request context. In hand-written controller methods, unwrap it by passing
the `CrudCtx` overlay reference to the `@Ctx()` parameter decorator:

```ts
@CrudList()
async list(@Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>) {
  return this.resolver.list(ctx);
}
```

### Injecting the CRUD Adapter

`InjectCrudAdapter(name)` injects the adapter registered for an entity key
by `CrudModule.forFeature()` — useful for reusing CRUD semantics from
services:

```ts
import { Injectable } from '@nestjs/common';
import { CrudAdapter, InjectCrudAdapter } from '@concepta/nestjs-crud';

@Injectable()
export class SomeService {
  constructor(
    @InjectCrudAdapter('photo')
    protected readonly crudAdapter: CrudAdapter<PhotoEntity>,
  ) {}
}
```

### Operation-to-Repository Mapping

| Operation | Adapter Method | Repository Method |
| --- | --- | --- |
| List | `list()` | `findAndCount()` |
| Read | `read()` | `findOne()` |
| Create | `create()` | `create()` |
| CreateBatch | `createBatch()` | `createMany()` |
| Update | `update()` | `update()` |
| Replace | `replace()` | `replace()` |
| Delete | `delete()` | `delete()` |
| SoftDelete | `softDelete()` | `softDelete()` |
| Restore | `restore()` | `restore()` |

**Update / Replace and optimistic locking.** When the entity carries a
version column (`CommonPostgresEntity`/`CommonSqliteEntity`), `update`/
`replace` are guarded by an atomic version compare-and-swap in the
repository layer. A concurrent write that lands between this request's read
and its write is rejected with `409 Conflict` (`OptimisticLockException`)
rather than silently clobbering. This requires `RepositoryModule.forRoot()`
to be imported (it provides `TransactionScope`) — see
[Optimistic Locking](../nestjs-repository-typeorm/README.md#optimistic-locking)
in `@concepta/nestjs-repository-typeorm`.

## Controller Build Modes

`ConfigurableCrudBuilder` supports three controller build paths.

### Fully Generated

Zero hand-written controller code. Pass controller options and an operations
array — the builder generates the controller class, methods, and providers.

```ts
import { Operation } from '@concepta/nestjs-core';
import { ConfigurableCrudBuilder } from '@concepta/nestjs-crud';

const builder = new ConfigurableCrudBuilder<PhotoEntity>({
  controller: {
    path: 'photos',
    entity: 'photo',
    request: { body: photoSchema },
    response: {
      resource: photoSchema,
      paginated: photoPaginatedSchema,
    },
  },
  operations: [
    { operation: Operation.List },
    { operation: Operation.Read },
    {
      operation: Operation.CreateBatch,
      request: { bodyBatch: photoCreateBatchSchema },
      response: {
        serialization: { resource: photoCreateBatchResponseSchema },
      },
    },
    { operation: Operation.Create, request: { body: photoCreateSchema } },
    { operation: Operation.Update, request: { body: photoUpdateSchema } },
    { operation: Operation.Delete },
  ],
});

const { controllers, providers } = builder.build();
```

Or use `CrudModule.forFeature()` which wraps the builder internally
(see [Module Registration](#module-registration)). The batch schemas are
defined in [Batch Create Schema](#batch-create-schema).

Generated controllers derive `@CrudBody({ schema })` metadata automatically
from each operation's `request.body` / `request.bodyBatch`, so schema
validation is wired without any hand-written code.

### Pre-Decorated

Full control. You write the controller class with all decorators and method
implementations. The builder extracts handler metadata for provider registration.

```ts
import { Inject } from '@nestjs/common';
import { Ctx } from '@concepta/nestjs-core';
import {
  CrudController,
  CrudList,
  CrudRead,
  CrudCreate,
  CrudBody,
  CrudCtx,
  CrudAdapterResolver,
  CrudResolverInterface,
  CrudContextInterface,
} from '@concepta/nestjs-crud';

@CrudController({
  path: 'photos',
  entity: 'photo',
  request: { body: photoSchema },
  response: { resource: photoSchema, paginated: photoPaginatedSchema },
})
export class PhotoController {
  constructor(
    @Inject(CrudAdapterResolver)
    private readonly resolver: CrudResolverInterface,
  ) {}

  @CrudList()
  async list(@Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>) {
    return this.resolver.list(ctx);
  }

  @CrudRead()
  async read(@Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>) {
    return this.resolver.read(ctx);
  }

  @CrudCreate({ request: { body: photoCreateSchema } })
  async create(
    @Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>,
    @CrudBody({ schema: photoCreateSchema }) dto: PhotoCreatable,
  ) {
    return this.resolver.create(ctx, dto);
  }
}

// Register:
CrudModule.forFeature<PhotoEntity>({
  crud: { controller: { class: PhotoController } },
})
```

Two rules for hand-written controllers:

- Pass the `CrudCtx` overlay reference to `@Ctx(...)` — a bare `@Ctx()`
  yields the raw application context, not the `CrudContextInterface`
  defined by `CrudContextOverlay`.
- Supply a body schema for validation: either explicitly via
  `@CrudBody({ schema })`, or by setting `request.body` (or `bodyBatch`) on
  the operation decorator or the controller. The validation pipe resolves
  `@CrudBody({ schema })` first, then falls back to `request.body`/
  `bodyBatch` resolved through the metadata hierarchy (method → class) — so
  a controller-level default is validated, not just a docs placeholder for
  `@ApiBody` to render.

#### Query-String Filtering Outside the Nine Operations

A hand-written route only gets `@Ctx(CrudCtx)` — and with it `ctx.query`'s
parsed filter/sort/pagination — when it carries one of the nine
`@Crud<Operation>` decorators (`@CrudList`, `@CrudRead`, etc.). A custom
search/aggregate/report endpoint that doesn't fit any of them still needs a
way to reuse CRUD's validated query-string contract. `@CrudQueryParams()`
does that independently of `@CrudController`, an entity, or an operation tag
— it works on any route:

```ts
import { Controller, Get } from '@nestjs/common';
import {
  CrudParsedQueryInterface,
  CrudQueryParams,
  CrudQueryParamsApi,
} from '@concepta/nestjs-crud';

@Controller('photos/search')
export class PhotoSearchController {
  @Get()
  @CrudQueryParamsApi()
  async search(@CrudQueryParams() query: CrudParsedQueryInterface<PhotoEntity>) {
    // query.filter, query.sort, query.limit, etc. — parsed and validated
    // the same way a generated @CrudList route's ctx.query would be.
  }
}
```

`@CrudQueryParamsApi()` documents the same standard filter/sort/pagination
`@ApiQuery` set generated List/Read routes get. Both decorators are optional
and independent — use either on its own if you don't need the other. Route
**path** params aren't covered here; Nest's native `@Param()` already handles
those with no friction.

### Hybrid

Provide a base class and an operations array. Existing methods are augmented
with decorator metadata; missing methods are generated.

```ts
@CrudController({
  path: 'photos',
  entity: 'photo',
  request: { body: photoSchema },
  response: { resource: photoSchema, paginated: photoPaginatedSchema },
})
export class PhotoController {
  constructor(
    @Inject(CrudAdapterResolver)
    private readonly resolver: CrudResolverInterface,
  ) {}

  @CrudList()
  async list(@Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>) {
    // Custom list logic
    return this.resolver.list(ctx);
  }
}

// list is augmented; read and create are generated
CrudModule.forFeature<PhotoEntity>({
  crud: {
    controller: { class: PhotoController },
    operations: [
      { operation: Operation.List },
      { operation: Operation.Read },
      { operation: Operation.Create, request: { body: photoCreateSchema } },
    ],
  },
})
```

Methods generated from the `operations` array derive `@CrudBody({ schema })`
automatically from `request.body` / `request.bodyBatch` — only methods you
write yourself need the explicit parameter decorators.

### Comparison

| | Fully Generated | Pre-Decorated | Hybrid |
| --- | --- | --- | --- |
| Controller class | Auto-generated | You write it | You write base |
| Method implementations | Auto-generated | You write them | Mix of both |
| Decorator application | Automatic | Manual | Automatic for new |
| Best for | Standard CRUD | Full customization | Partial customization |

## Operation Decorators

Applied at method level. Each decorator sets the HTTP method, default path,
and operation metadata.

| Decorator | HTTP | Default Path | Operation |
| --- | --- | --- | --- |
| `@CrudList()` | GET | `/` | `Operation.List` |
| `@CrudRead()` | GET | `/:id` | `Operation.Read` |
| `@CrudCreate()` | POST | `/` | `Operation.Create` |
| `@CrudCreateBatch()` | POST | `/bulk` | `Operation.CreateBatch` |
| `@CrudUpdate()` | PATCH | `/:id` | `Operation.Update` |
| `@CrudReplace()` | PUT | `/:id` | `Operation.Replace` |
| `@CrudDelete()` | DELETE | `/:id` | `Operation.Delete` |
| `@CrudSoftDelete()` | DELETE | `/:id` | `Operation.SoftDelete` |
| `@CrudRestore()` | PATCH | `/restore/:id` | `Operation.Restore` |

### Operation Options

All operation decorators (and `operations[]` config entries) accept a common
options object:

```ts
{
  path?: string | string[];
  methodName?: string;                    // Target/created method name (config only)
  request?: {
    params?: CrudParamsOptionsInterface;  // URL param config
    body?: CrudSchema;                    // z.ZodType — single-entity body schema
    bodyBatch?: CrudSchema;               // z.ZodType — batch body schema (CreateBatch)
    validation?: StandardSchemaValidationPipeOptions | false;
  };
  response?: {
    resource?: CrudSchema;                // z.ZodType — single resource response
    paginated?: CrudSchema;               // z.ZodType — paginated response
    serialization?: CrudSerializationOptionsInterface;
    returnDeleted?: boolean;              // Delete/SoftDelete only
    returnRestored?: boolean;             // Restore only
  };
  transactional?: boolean | TransactionalOptions;

  // Query operations (List, Read):
  query?: Type<CrudQueryInterface>;
  queryHandler?: Type<CrudQueryHandlerInterface>;

  // Command operations (Create, Update, Replace, Delete, ...):
  command?: Type<CrudCommandInterface>;
  commandHandler?: Type<CrudCommandHandlerInterface>;

  extraDecorators?: ReturnType<typeof applyDecorators>[];

  api?: {
    operation?: ApiOperationOptions;
    query?: ApiQueryOptions[];
    params?: ApiParamOptions;
    body?: ApiBodyOptions;                // Create/CreateBatch/Update/Replace only
    response?: ApiResponseOptions;
  };
}
```

- `CrudSchema` is `z.ZodType` — every request/response shape is a Zod
  (Standard Schema) schema.
- `validation` merges into the `StandardSchemaValidationPipe` used for
  `@CrudBody()` schemas. Available keys: `transform`,
  `validateCustomDecorators`, `validateOptions`, `errorHttpStatusCode`,
  `exceptionFactory`. Pass `false` to disable validation for the body
  (it is still bound, just unvalidated).
- `api.body` is only read by the four write operations that accept a body
  (Create, CreateBatch, Update, Replace); it's ignored on read/delete
  operations. It merges (`description`, `examples`, `required`, ...) into
  the `@ApiBody()` documenting the resolved request body schema — a
  `schema`/`type` set here is superseded by the resolved schema and has no
  effect. The one exception: when no schema resolves anywhere for the
  operation, `api.body` is instead applied verbatim as a plain `@ApiBody()`
  — that is the one case where a `schema`/`type` set here does take effect.
- `response.serialization` is `CrudSerializationOptionsInterface`:
  `{ resource?: CrudSchema; paginated?: CrudSchema }` — schema
  overrides for response serialization.
- `methodName` targets (or names) a specific controller method in
  hybrid/generated mode, allowing multiple operations of the same type.

### Delete/Restore Response Behavior

By default, Delete, SoftDelete, and Restore return `204 No Content`. Set
`returnDeleted: true` or `returnRestored: true` to return `200 OK` with the
entity body:

```ts
{ operation: Operation.Delete, response: { returnDeleted: true } }
{ operation: Operation.SoftDelete, response: { returnDeleted: true } }
{ operation: Operation.Restore, response: { returnRestored: true } }
```

## Route Option Decorators

Route option decorators configure query behavior on a per-method basis.
Method-level settings override controller-level defaults.

| Decorator | Description |
| --- | --- |
| `@CrudFilter(filter)` | Server-side default filter conditions |
| `@CrudSort(sort)` | Default sort order |
| `@CrudJoin(join)` | Relations to join |
| `@CrudLimit(n)` | Default page size |
| `@CrudMaxLimit(n)` | Maximum allowed page size |
| `@CrudAllow(columns)` | Whitelist query-accessible columns |
| `@CrudExclude(columns)` | Blacklist columns from queries |
| `@CrudPersist(columns)` | Always include these columns in select |
| `@CrudCache(seconds)` | Cache duration (pass `false` to disable) |
| `@CrudSerialize(options)` | Serialization schema overrides (`{ resource?, paginated? }`) |
| `@CrudValidate(options)` | `StandardSchemaValidationPipeOptions` or `false` to disable |
| `@CrudReturnDeleted(bool)` | Return entity body on delete |
| `@CrudReturnRestored(bool)` | Return entity body on restore |

### Per-Method Example

```ts
@CrudController({
  path: 'photos',
  entity: 'photo',
  request: { body: photoSchema },
  response: { resource: photoSchema, paginated: photoPaginatedSchema },
})
export class PhotoController {
  @CrudList()
  @CrudLimit(20)
  @CrudMaxLimit(100)
  @CrudSort([{ field: 'createdAt', order: 'DESC' }])
  @CrudAllow(['name', 'description', 'createdAt'])
  async list(@Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>) {
    return this.resolver.list(ctx);
  }

  @CrudDelete()
  @CrudReturnDeleted(true)
  async delete(@Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>) {
    return this.resolver.delete(ctx);
  }
}
```

### CrudQueryOptionsInterface

These decorators map to `CrudQueryOptionsInterface<T>`:

```ts
interface CrudQueryOptionsInterface<T> {
  allow?: EntityColumn<T>[];
  exclude?: EntityColumn<T>[];
  persist?: EntityColumn<T>[];
  filter?: QueryFilterOption<T>;
  sort?: OrderSortKey<T>[];
  limit?: number;
  maxLimit?: number;
  cache?: number | false;
  join?: JoinClause[];
}
```

## Query String Parameters

The CRUD module parses HTTP query parameters into `CrudParsedQueryInterface`
via `CrudQueryParser`.

### Parameters

| Parameter | Format | Example |
| --- | --- | --- |
| `select` | `field1,field2` | `?select=name,description` |
| `filter` | `field\|\|$op\|\|value` | `?filter=status\|\|$eq\|\|active` |
| `or` | `field\|\|$op\|\|value` | `?or=status\|\|$eq\|\|archived` |
| `sort` | `field,ASC\|DESC` | `?sort=createdAt,DESC` |
| `limit` | number | `?limit=25` |
| `offset` | number | `?offset=50` |
| `page` | number (1-indexed) | `?page=3` |
| `cache` | number (seconds) | `?cache=0` |
| `includeDeleted` | `1` or `0` | `?includeDeleted=1` |
| `s` | JSON search object | `?s={"name":{"$contains":"sunset"}}` |

`includeDeleted` only affects reads (list, read). A write (update, replace,
upsert) targeting a soft-deleted row always returns 409 Conflict — soft-deleted
rows are immutable at the repository level regardless of this parameter. See
[nestjs-repository's Soft-Deleted Immutability
section](../nestjs-repository/README.md#soft-deleted-immutability).

### Comparison Operators

| Operator | Description |
| --- | --- |
| `$eq` | Equal |
| `$ne` | Not equal |
| `$gt` | Greater than |
| `$gte` | Greater than or equal |
| `$lt` | Less than |
| `$lte` | Less than or equal |
| `$starts` | Starts with |
| `$nstarts` | Does not start with |
| `$ends` | Ends with |
| `$nends` | Does not end with |
| `$contains` | Contains substring |
| `$ncontains` | Does not contain |
| `$in` | In list (comma-separated) |
| `$nin` | Not in list |
| `$null` | Is null (no value needed) |
| `$nnull` | Not null (no value needed) |
| `$between` | Between two values (comma-separated) |

### Filter Combination Rules

- Multiple `filter` params are AND-combined
- Multiple `or` params provide an alternative set
- When both present: `(AND of filters) OR (AND of ors)`
- The `s` (search) parameter supersedes `filter` and `or`

### Multiple Filters

```text
GET /photos?filter[0]=status||$eq||active&filter[1]=views||$gt||100
```

### Relation Filters

Use dot notation to filter by related entity fields:

```text
GET /photos?filter=author.name||$eq||Alice
```

## Paginated Response

List operations return a paginated response:

```ts
interface CrudResponsePaginatedInterface<T> {
  data: T[];         // Items on current page
  limit: number;     // Items per page
  count: number;     // Items on current page (data.length)
  total: number;     // Total items across all pages
  page: number;      // Current page (1-indexed)
  pageCount: number; // Total number of pages
  metrics?: CrudResponseMetrics; // Fetch metrics (federated responses only)
}

interface CrudResponseMetrics {
  totalFetched: number; // Rows fetched
  totalValid: number;   // Rows that passed post-fetch checks
  fetchCalls: number;   // Fetch calls made
  duration: number;     // Fetch duration in milliseconds
}
```

Both interfaces are exported from `@concepta/nestjs-crud`. `metrics` is only
present on federated responses.

### Paginated Response Schema

Wrap your resource schema with the `paginatedSchema` factory and register it
as a named OpenAPI component:

```ts
import { withNamedComponent } from '@concepta/nestjs-core';
import { paginatedSchema } from '@concepta/nestjs-crud';

export const photoPaginatedSchema = withNamedComponent(
  paginatedSchema(photoSchema),
  'PhotoPaginated',
);
```

`paginatedSchema(itemSchema)` produces the `{ data, limit, count, total,
page, pageCount }` envelope with `data: z.array(itemSchema)`. It
intentionally omits `metrics`.

### Batch Create Schema

`createBatchSchema(itemSchema)` builds the request body schema for
`Operation.CreateBatch` — an object with a `bulk` array requiring at least
one item (`.min(1)`):

```ts
import { withOpenApi } from '@concepta/nestjs-core';
import { createBatchSchema } from '@concepta/nestjs-crud';

export const photoCreateBatchSchema = withOpenApi(
  createBatchSchema(photoCreateSchema),
);

// Response shape for CreateBatch — a bare array of created resources.
// Schema serialization validates the response verbatim, so the batch
// operation must supply an array schema via response.serialization.resource.
export const photoCreateBatchResponseSchema = z.array(photoSchema);
```

Pass them on the CreateBatch operation:

```ts
{
  operation: Operation.CreateBatch,
  request: { bodyBatch: photoCreateBatchSchema },
  response: { serialization: { resource: photoCreateBatchResponseSchema } },
}
```

## Serialization and Validation

### Serialization

Responses are serialized by parsing them through the resolved Zod response
schema. `CrudSerializeInterceptor` picks the paginated schema
(`response.paginated` / `serialization.paginated`) for paginated
payloads and the resource schema (`response.resource` /
`serialization.resource`) otherwise, then runs the schema's `.parse()` on the
outgoing payload.

Serialization is fail-closed:

- Keys not declared in the schema are stripped — undeclared fields never
  leak into responses.
- If the payload does not satisfy the schema, parsing throws instead of
  returning a partially-valid response.
- If no response schema resolves at all, the interceptor throws a
  `CrudException` rather than returning unserialized data.

Operation-level `response.serialization` (`{ resource, paginated }`)
overrides the controller-level `response.resource` / `response.paginated`
schemas, per route.

### Validation

Request bodies declared with `@CrudBody({ schema })` are validated by a
per-parameter `StandardSchemaValidationPipe` running the Zod schema. The
default `exceptionFactory` prefixes each issue message with its field path,
producing field-identifying `400 Bad Request` messages such as:

```text
name: Too big: expected string to have <=10 characters
```

Override pipe options per-route via `request.validation`:

```ts
@CrudCreate({
  request: {
    body: photoCreateSchema,
    validation: { errorHttpStatusCode: 422 },
  },
})
```

Or with the route decorator:

```ts
@CrudValidate({ errorHttpStatusCode: 422 })
```

Available options (`StandardSchemaValidationPipeOptions` from
`@nestjs/common`): `transform`, `validateCustomDecorators`,
`validateOptions`, `errorHttpStatusCode`, `exceptionFactory`. The
class-validator era options (`whitelist`, `forbidNonWhitelisted`, etc.) no
longer exist — undeclared keys are handled by the schemas themselves.

Pass `validation: false` (or `@CrudValidate(false)`) to disable validation
for that body — the parameter is still bound, just unvalidated.

In hand-written controllers, the validation schema resolves from
`@CrudBody({ schema })` first, falling back to `request.body`/`bodyBatch`
resolved through the metadata hierarchy (method → class) — so a
controller-level default is validated too, not just a docs placeholder for
`@ApiBody` to render (see [Controller Build Modes](#controller-build-modes)).
Builder-generated and hybrid-generated methods derive `@CrudBody({ schema })`
automatically from `operations[].request.body`.

## OpenAPI Documents

Pass the `standardSchemaConverter` from `@concepta/nestjs-core` when
creating the swagger document so Zod schemas are converted to OpenAPI
component schemas:

```ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { standardSchemaConverter } from '@concepta/nestjs-core';

const doc = SwaggerModule.createDocument(
  app,
  new DocumentBuilder().setTitle('API').setVersion('1.0').build(),
  { standardSchemaConverter },
);
```

Schemas wrapped with `withNamedComponent(schema, 'Photo')` register under
bare component ids (`Photo`, `PhotoPaginated`); schemas wrapped with
`withOpenApi(schema)` are documented inline (typical for request bodies).

A parameter-level `@CrudBody({ schema })` takes precedence over the
per-operation `request.body`/`bodyBatch` schema, which in turn takes
precedence over the controller-level default — so PATCH/PUT document their
own narrower schemas, and a hand-written controller's explicit `@CrudBody`
schema always wins.

## Resolvers

Resolvers control how operations are dispatched from the controller to the
adapter.

| Resolver | Dispatch | When to Use |
| --- | --- | --- |
| `CrudAdapterResolver` | Calls `CrudAdapter` directly | Default. Simple CRUD |
| `CrudOperationResolver` | Resolves handler via `ModuleRef` | Custom handler logic without CQRS |
| `CrudCqrsResolver` | Dispatches via `QueryBus` / `CommandBus` | Full CQRS with sagas and events |

### Setting the Default Resolver

Globally:

```ts
CrudModule.forRoot({
  defaultResolver: CrudOperationResolver,
})
```

Per-controller:

```ts
@CrudController({
  path: 'photos',
  entity: 'photo',
  resolver: CrudCqrsResolver,
  ...
})
```

## CQRS Integration

Optional integration with `@nestjs/cqrs` for saga, event, and cross-module
routing support.

### Setup

```sh
yarn add @nestjs/cqrs
```

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CrudModule, CrudCqrsResolver } from '@concepta/nestjs-crud';

@Module({
  imports: [
    CqrsModule.forRoot(),
    CrudModule.forRoot({
      defaultResolver: CrudCqrsResolver,
    }),
  ],
})
export class AppModule {}
```

### Built-in Queries and Commands

| Operation | Class | Handler |
| --- | --- | --- |
| List | `CrudListQuery` | `CrudListHandler` |
| Read | `CrudReadQuery` | `CrudReadHandler` |
| Create | `CrudCreateCommand` | `CrudCreateHandler` |
| CreateBatch | `CrudCreateBatchCommand` | `CrudCreateBatchHandler` |
| Update | `CrudUpdateCommand` | `CrudUpdateHandler` |
| Replace | `CrudReplaceCommand` | `CrudReplaceHandler` |
| Delete | `CrudDeleteCommand` | `CrudDeleteHandler` |
| SoftDelete | `CrudSoftDeleteCommand` | `CrudSoftDeleteHandler` |
| Restore | `CrudRestoreCommand` | `CrudRestoreHandler` |

### Custom Handlers

Override the handler for a specific operation:

```ts
{ operation: Operation.Create, commandHandler: CustomCreateHandler }
```

Or with the decorator:

```ts
@CrudCreate()
@CrudCommandHandler(CustomCreateHandler)
async create(
  @Ctx(CrudCtx) ctx: CrudContextInterface<PhotoEntity>,
  @CrudBody({ schema: photoCreateSchema }) dto: PhotoCreatable,
) { ... }
```

## Specifications and Hooks

`CrudSpec` provides factory methods for matching CRUD operations. Specifications
act as boolean gates — a hook method only runs when its spec is satisfied by the
current `CrudContextInterface`.

### CrudSpec Methods

| Method | Description |
| --- | --- |
| `CrudSpec.operation(op)` | Match a specific operation |
| `CrudSpec.action(action)` | Match an action category |
| `CrudSpec.isCreate()` | CREATE action |
| `CrudSpec.isRead()` | READ action |
| `CrudSpec.isUpdate()` | UPDATE action |
| `CrudSpec.isDelete()` | DELETE action |
| `CrudSpec.isQuery()` | List + Read operations |
| `CrudSpec.isWrite()` | Create + CreateBatch + Update + Replace |
| `CrudSpec.isMutation()` | All state-changing operations |
| `CrudSpec.and(...)` | All specifications must match |
| `CrudSpec.or(...)` | Any specification must match |
| `CrudSpec.not(spec)` | Negate a specification |
| `CrudSpec.always()` | Always matches (default) |
| `CrudSpec.never()` | Never matches |

### Defining a Hook

Use `@RepoHook()` from `@concepta/nestjs-repository` to mark a class as a
repository hook. Decorate methods with lifecycle decorators (`@BeforeCreate`,
`@AfterFind`, etc.) and optionally pass a `CrudSpec` to restrict when the
method runs:

```ts
import { Injectable } from '@nestjs/common';
import {
  RepoHook,
  BeforeFind,
  AfterCreate,
  AfterUpdate,
} from '@concepta/nestjs-repository';
import { CrudSpec } from '@concepta/nestjs-crud';

@Injectable()
@RepoHook()
export class AuditHook {
  // Runs on ALL find operations (no spec restriction)
  @BeforeFind()
  async addTenantFilter(options, ctx) {
    const tenantId = ctx.locals?.tenantId;
    if (tenantId) {
      // add tenant filter to query options
    }
    return options;
  }

  // Runs ONLY when the CRUD operation is a Create
  @AfterCreate(CrudSpec.isCreate())
  async logCreation(entity, ctx) {
    console.log(`Created ${ctx.operation}:`, entity.id);
    return entity;
  }

  // Runs ONLY on write operations (Create, Update, Replace)
  @AfterUpdate(CrudSpec.isWrite())
  async logModification(entity, ctx) {
    console.log(`Modified via ${ctx.operation}:`, entity.id);
    return entity;
  }
}
```

### Registering Hooks

Attach hooks to a controller with `@UseHooks()` from `@concepta/nestjs-core`.
Hooks can be plain classes or `{ hook, spec }` objects:

```ts
import { UseHooks } from '@concepta/nestjs-core';
import { CrudSpec } from '@concepta/nestjs-crud';

// Simple: hook runs for all operations on this controller
@UseHooks(AuditHook)
@CrudController({ ... })
export class PhotoController { ... }

// With spec: hook only runs for mutations
@UseHooks({ hook: AuditHook, spec: CrudSpec.isMutation() })
@CrudController({ ... })
export class PhotoController { ... }

// Method-level: adds to class-level hooks
@UseHooks(AuditHook)
@CrudController({ ... })
export class PhotoController {
  @CrudDelete()
  @UseHooks({ hook: AdminAuditHook, spec: CrudSpec.isDelete() })
  async delete(@Ctx(CrudCtx) ctx) { ... }
}
```

### Spec Resolution Priority

When multiple specs are defined, the most specific wins:

1. Hook method parameter: `@BeforeCreate(spec)` — highest
2. Class-level: `@RepoHook(spec)`
3. `@UseHooks({ hook, spec })` registration
4. Default: `CrudSpec.always()` — lowest

### Composing Specifications

```ts
// Write operations that are NOT deletes
CrudSpec.and(CrudSpec.isWrite(), CrudSpec.not(CrudSpec.isDelete()))

// List or Read
CrudSpec.or(
  CrudSpec.operation(Operation.List),
  CrudSpec.operation(Operation.Read),
)

// Specific operation
CrudSpec.operation(Operation.Create)
```

### Available Hook Decorators

Hook method decorators from `@concepta/nestjs-repository`:

| Decorator | Fires on |
| --- | --- |
| `@BeforeRead` / `@AfterRead` | Any read (find, findOne, count, findAndCount) |
| `@BeforeWrite` / `@AfterWrite` | Any write (create, update, replace) |
| `@BeforeTransition` / `@AfterTransition` | Lifecycle changes (softDelete, restore) |
| `@BeforeDestroy` / `@AfterDestroy` | Hard delete |
| `@BeforeFind` / `@AfterFind` | `find()` |
| `@BeforeFindOne` / `@AfterFindOne` | `findOne()` |
| `@BeforeFindAndCount` / `@AfterFindAndCount` | `findAndCount()` |
| `@BeforeCreate` / `@AfterCreate` | `create()` |
| `@BeforeCreateMany` / `@AfterCreateMany` | `createMany()` |
| `@BeforeUpdate` / `@AfterUpdate` | `update()` |
| `@BeforeReplace` / `@AfterReplace` | `replace()` |
| `@BeforeDelete` / `@AfterDelete` | `delete()` |
| `@BeforeSoftDelete` / `@AfterSoftDelete` | `softDelete()` |
| `@BeforeRestore` / `@AfterRestore` | `restore()` |

## Exceptions

| Exception | Description |
| --- | --- |
| `CrudException` | Base CRUD exception |
| `CrudContextException` | Error during context building (interceptor) |
| `CrudDecoratorException` | Invalid decorator configuration |
| `CrudQueryException` | Error executing a query or command |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-crud` | Module, adapter, decorators, resolvers, CQRS queries/commands/handlers, schema factories (`paginatedSchema`, `createBatchSchema`), specifications, exceptions |
