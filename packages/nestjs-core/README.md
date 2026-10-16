# @concepta/nestjs-core

Application-level module that wires Rockets framework primitives into a NestJS
application. Register it once at the root and all Rockets features it provides
become globally available without importing them in every module.

Provides: **hook system** · **per-request context overlays** · **domain
exceptions** · **event context** · **aggregate base classes** · **testing
utilities**.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-core)](https://www.npmjs.com/package/@concepta/nestjs-core)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-core)](https://www.npmjs.com/package/@concepta/nestjs-core)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [Hook Feature](#hook-feature)
  - [Defining a Hook](#defining-a-hook)
  - [Attaching Hooks to Controllers](#attaching-hooks-to-controllers)
  - [Specification Guards](#specification-guards)
  - [Consuming Hooks](#consuming-hooks)
- [Context System](#context-system)
- [Exceptions](#exceptions)
- [Schemas & OpenAPI](#schemas--openapi)
- [Event Context](#event-context)
- [Aggregate](#aggregate-conceptanestjs-coreaggregate-subpath)
- [Money](#money-conceptanestjs-coreoptionalmoney-subpath)
- [Testing](#testing-conceptanestjs-coretesting-subpath)
- [API Reference](#api-reference)

## Installation

```sh
yarn add @concepta/nestjs-core @nestjs/common @nestjs/core @nestjs/swagger rxjs
```

### Requirements

ESM-only — no CJS build is published. Requires Node `>= 22.12` and
NestJS 12.

### Subpath exports

| Import path | What it provides |
| --- | --- |
| `@concepta/nestjs-core` | Full public surface: hooks, context, exceptions, references, utilities, enums, schemas (`auditSchema`, `referenceIdSchema`, `conformsTo`, `withOpenApi`, `withNamedComponent`, `standardSchemaConverter`, `isStandardSchema`). |
| `@concepta/nestjs-core/aggregate` | `MutableAggregate`, `AppendOnlyAggregate`, `DomainAggregate`, `DomainMapper`, `mutableAggregateSchema`, `appendOnlyAggregateSchema`, `AggregateMetaInterface`, `CorrectableInterface`. |
| `@concepta/nestjs-core/optional/money` | `Money`, `Rounding`, `RoundingMode`, `MoneyInterface`; `configureCurrencies`, `minorUnitsOf`, `isKnownCurrency`, `assertKnownCurrency`; `moneySchema`, `moneyAmountSchema`, `currencyCodeSchema`; `moneyAmountTransformer`; and the `Currency*`/`Money*` exceptions. Requires the optional peer `decimal.js`. |
| `@concepta/nestjs-core/testing` | `createMockEventPublisher`, `createMockCommandBus`, `createMockQueryBus`, `collectRuntimeExceptionClassNames`, `createTestEventContext`, `resetCurrencies`. |

### Dependencies

Direct dependencies: `ms`, `rxjs`, `zod` (^4.4.3).

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS 12 framework — install explicitly, no longer bundled |
| `@nestjs/core` | Yes | Module reference and reflection — install explicitly |
| `@nestjs/swagger` | Yes | Required by the schema/OpenAPI bridge utilities — install explicitly |
| `rxjs` | Yes | Observable support |
| `@nestjs/cqrs` | No | Optional peer — only if using CQRS patterns |
| `decimal.js` | No | Optional peer — only if importing `@concepta/nestjs-core/optional/money` |

## Module Registration

Register `CoreModule` once at the application root. It defaults to
`global: true` so a global `APP_INTERCEPTOR` registered by the module
intercepts requests from every controller in the app without additional imports.

### Synchronous

```ts
import { CoreModule } from '@concepta/nestjs-core';

@Module({
  imports: [CoreModule.forRoot()],
})
export class AppModule {}
```

### Asynchronous

```ts
@Module({
  imports: [
    CoreModule.forRootAsync({
      useFactory: async () => ({}),
    }),
  ],
})
export class AppModule {}
```

### Methods

| Method | Description |
| --- | --- |
| `forRoot(options?)` | Synchronous global registration. `global: true` by default. |
| `forRootAsync(options)` | Asynchronous global registration. |
| `register(options)` | Synchronous non-global registration (manual scope control). `options` is required — only `forRoot` defaults it to `{}`. |
| `registerAsync(options)` | Asynchronous non-global registration. |

## Hook Feature

The hook system enables conditional execution of NestJS injectable classes
(hooks) attached to controllers or methods. A global `APP_INTERCEPTOR`
registered by `CoreModule` reads `@UseHooks(...)` metadata from the
current handler and attaches the resolved hook list to the request context via
`HooksCtx`. Downstream services consume the list via `HookResolverService`.

### Defining a Hook

Use `@Hook({ type })` to mark an injectable class as a hook. Methods are
decorated with subsystem-specific decorators (e.g. `@BeforeFind()`,
`@AfterCreate()` from `@concepta/nestjs-repository`) — `@RepoHook()` used
below is sugar for `@Hook({ type: RepoHook })`, see that package's README
for the full decorator set and its write-hook merge semantics.

Every hook method **must return** the (possibly modified) payload — mutating
the argument in place and returning nothing is silently discarded by the
pipeline that calls it (`@concepta/nestjs-repository`'s hook execution
merges/replaces based on the *return value*, never the input reference).

```ts
import { Hook, type AppContextInterface, OverlayRef } from '@concepta/nestjs-core';
import { RepoHook, BeforeFind, type RepositoryFindOptions, Where } from '@concepta/nestjs-repository';

export const TenantCtx = new OverlayRef<'withTenant', { tenantId: string }>(
  'withTenant',
);

@Hook({ type: RepoHook })
export class TenantScopeHook {
  @BeforeFind()
  async addTenantFilter(
    options: RepositoryFindOptions<OrderEntity>,
    ctx: AppContextInterface,
  ): Promise<RepositoryFindOptions<OrderEntity>> {
    // Refuses a call that cannot identify a tenant, rather than reading
    // across all of them.
    const tenant = ctx.require(TenantCtx).withTenant();

    const condition = Where.eq('tenantId', tenant.tenantId);
    return {
      ...options,
      where: options.where ? Where.and(options.where, condition) : condition,
    };
  }
}
```

Forgetting `@Hook()` is a hard failure, not a silent no-op: passing a class
without the class-level `@Hook()` decorator to `@UseHooks()` throws
`HookNotDecoratedException` as soon as the decorated class is defined, and a
hook that can't be resolved from the module's providers throws
`HookProviderNotFoundException` when it first runs.
Two more things have to be true:

1. **`CoreModule.forRoot()`** must be imported — it provides
   `HookResolverService` and the interceptor that populates hook state on
   the request context. A subsystem that registers hooks against a declared
   target fails outright without it — `@concepta/nestjs-repository` refuses an
   entity registered with hooks at startup. The first repository built without
   it emits a `ROCKETS_HOOKS_NOT_WIRED` warning, once per process, because a
   route-declared `@UseHooks` hook does not run without it.
2. **The hook class must be listed in `providers`** for DI to resolve it.

A hook attached with `@UseHooks()` alone, in an app with no repository module,
is the case with the weakest signal: nothing warns, and the hook is simply
inert.

### Attaching Hooks to Controllers

`@UseHooks(...hooks)` is applied to a controller class or a specific method.
Method-level decorators are merged with class-level decorators.

```ts
import { UseHooks } from '@concepta/nestjs-core';

// Class-level — all methods get TenantScopeHook
@UseHooks(TenantScopeHook)
@Controller('users')
export class UserController {
  @Get()
  findAll() { ... }

  // Method-level addition — this method also gets AuditHook
  @UseHooks(AuditHook)
  @Delete(':id')
  delete() { ... }
}
```

#### What a hook reaches

`@UseHooks` stores the hook list on the request's `ctx`, not on anything the
hook is *about*. Every call that receives that `ctx` reads the same list, so a
hook declared here runs for every operation of its subsystem the request
touches — including other entities written later in the request, and ones
reached through a hook that forwards its `ctx`. The subsystem `type` is the
only bound: a `RepoHook` never runs on cache operations.

That is right for a cross-cutting hook and wrong for one that belongs to a
single thing, so choose by where you register it rather than by adding a guard:

| Intent | Where to register | Specification |
| --- | --- | --- |
| Cross-cutting — logging, metrics, audit | `@UseHooks` on the controller | Not needed |
| Specific to one entity — stamp, scope, validation | `hooks:` in the subsystem's own registration, e.g. `RepositoryModule.forRoot` | Not needed |
| A subset of either | Either | Required |

A cross-cutting hook should *not* enumerate entities with a specification: a forgotten
one loses coverage silently, which is the failure the hook existed to prevent.

### Specification Guards

Specifications are evaluated at runtime to decide whether a hook (or a specific
hook method) executes. Use the `Spec` factory for common compositions:

```ts
import { Spec } from '@concepta/nestjs-core';

Spec.always()              // always executes
Spec.never()               // never executes (useful to disable temporarily)
Spec.and(specA, specB)     // both must be satisfied
Spec.or(specA, specB)      // either must be satisfied
Spec.not(spec)             // negates spec
```

Custom specifications implement `SpecificationInterface<Ctx>`:

```ts
import { SpecificationInterface } from '@concepta/nestjs-core';

export class IsAdminSpec implements SpecificationInterface {
  isSatisfiedBy(ctx: PlainLiteralObject): boolean {
    return ctx.user?.role === 'admin';
  }
}
```

### Consuming Hooks

`HookResolverService` is exported by `CoreModule` and available for
injection. It resolves and executes the matching hook methods from the list it
is given, passing the payload through each applicable hook in sequence.

```ts
import { Injectable } from '@nestjs/common';

import {
  getAppContext,
  HookResolverService,
  HooksCtx,
} from '@concepta/nestjs-core';
import { RepoHook } from '@concepta/nestjs-repository';

@Injectable()
export class SomeService {
  constructor(private readonly hookResolver: HookResolverService) {}

  async findAll(req: Request, options: FindOptions): Promise<FindOptions> {
    const ctx = getAppContext(req);
    // hookType is the decorator object (has KEY property); payload is what
    // flows through hooks; hooks is the list that applies to this call; ctx is
    // the full app context, passed to each hook and to its specification.
    // `supports()` rather than `require()`: a route that declared no hooks
    // has no overlay, and an empty list is the right answer for it.
    const hooks = ctx.supports(HooksCtx) ? ctx.with(HooksCtx).hooks : [];
    return this.hookResolver.execute(
      RepoHook,
      'beforeFind',
      options,
      hooks,
      ctx,
    );
  }
}
```

`execute<T>(hookType, methodKey, payload, hooks, ctx, filter?)` returns the
payload after all applicable hooks have processed it.

The hook list is a parameter rather than something read off `ctx`. A context
is forwarded between entities and subsystems, so resolving from it made a
nested call inherit the *caller's* hooks and run none of its own, silently.
The caller owns which hooks apply; `ctx` is only what they run against.

## Context System

`AppContextHost` is a per-request container of typed overlays. Each overlay
adds a `with*()` method to the context, carrying a typed set of resolved
values for that request.

`getAppContext(request)` returns the `AppContextHost` for a request, creating
one on first access.

Most overlays live for the whole request. For one whose lifetime is
narrower — e.g. a single unit of work sharing a longer-lived context —
`ctx.removeOverlay(ref)` undoes `defineOverlay`, so the same context can
later host a fresh instance of that overlay via another `defineOverlay`
call. It only removes an overlay defined directly on that host — one
inherited from a parent context (e.g. via `with()`) is left untouched, and
the call returns `false` rather than removing anything.

### Immutable overlays

An overlay carrying something a request must not be able to change — an
authenticated principal, a tenant — can be defined `{ immutable: true }`:

```ts
ctx.defineOverlay(MyCtx, { tenantId }, { immutable: true });
```

That overlay then cannot be removed, redefined, or shadowed on a prototype
child. Removal is refused quietly — `removeOverlay` returns `false` and leaves
it in place — while redefining or shadowing throws
`OverlayImmutableException`. Hardening an overlay that is already defined
mutably throws `OverlayAlreadyDefinedException` rather than silently doing
nothing, so a definer is never left believing it protected something it did
not.

It is opt-in because some overlays need the opposite — a transaction overlay
is removed at teardown and deliberately re-declared on narrower children.

The values are frozen **one level deep**: a frozen copy is stored, so
reassigning a top-level key has no effect, but an object nested inside those
values is still shared with whoever defined the overlay and stays mutable.
Freezing that is the definer's call — the option protects the binding and the
values it was handed, not the object graph underneath. Keeping overlay values
flat sidesteps the question.

Reading an overlay is already safe from tampering regardless: `with()` returns
a fresh object each call, so mutating what you receive never affects a later
read.

**Defining a custom overlay:**

```ts
import {
  ContextOverlayInterceptor,
  OverlayRef,
  getAppContext,
} from '@concepta/nestjs-core';
import { Injectable, ExecutionContext } from '@nestjs/common';

// Typed token — export this for consumers
export const MyCtx = new OverlayRef<'withMy', { tenantId: string }>('withMy');

@Injectable()
export class MyContextOverlay extends ContextOverlayInterceptor {
  readonly ref = MyCtx;

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);
    ctx.defineOverlay(MyCtx, { tenantId: request.headers['x-tenant-id'] });
  }
}

// Register as a global interceptor in your module:
// { provide: APP_INTERCEPTOR, useClass: MyContextOverlay }
```

**Consuming an overlay in a controller:**

```ts
import { Ctx } from '@concepta/nestjs-core';

@Controller('users')
export class UserController {
  @Get()
  // @Ctx(ref) injects the resolved overlay props directly
  findAll(@Ctx(MyCtx) my: { tenantId: string }) {
    return my.tenantId;
  }
}
```

**Or read it from the raw context:**

```ts
const ctx = getAppContext(request);
const { tenantId } = ctx.with(MyCtx);
```

`ContextOverlayInterceptor` is the abstract base class for custom overlays.
Subclasses implement `ref` (the `OverlayRef` token) and `attach()` (where
`defineOverlay` is called). Register them as global `APP_INTERCEPTOR` providers.

### Correlation Context

`CorrelationContextOverlay` seeds `correlationId`/`causationId` from the
inbound `x-correlation-id` request header, minting a fresh self-correlated
pair when the header is absent. Attaching it twice is idempotent — the
first-seen pair wins. This is the overlay `createEventContext` reads from
(see [Event Context](#event-context)).

Unlike other overlays, which are registered by whichever feature module
owns them, `CorrelationContextOverlay` is registered by `CoreModule` itself
— correlation has no single natural owning feature module, since every
package needs it equally. **Importing `CoreModule` at the application root
is required** for any app using event-context-bearing packages; without it
the overlay never attaches, and every event context silently falls back to
a synthesized, unlinked correlation pair.

```ts
import { CoreModule } from '@concepta/nestjs-core';

@Module({
  imports: [CoreModule.forRoot()],
})
export class AppModule {}
```

Like all overlays, `CorrelationContextOverlay.attach()` reads the request
via `context.switchToHttp()` — on RPC/WS/GraphQL transports this yields a
bogus request object, the same limitation every overlay in this system has.

## Exceptions

### RuntimeException

`RuntimeException` extends NestJS `HttpException` and adds a machine-readable
error code, safe message, and structured context. Subclass it to define
module-specific error codes. Because it is an `HttpException`, subclasses get
`getStatus()` and `getResponse()` for free, and the wire body is composed
lazily in an overridden `getResponse()` — so it always reflects the final
`errorCode` assigned by subclass constructors.

```ts
import { RuntimeException } from '@concepta/nestjs-core';
import { HttpStatus } from '@nestjs/common';

// Simple message
throw new RuntimeException('Something failed');

// With options
throw new RuntimeException({
  message: 'Entity %s not found',
  messageParams: [id],
  httpStatus: HttpStatus.NOT_FOUND,
  safeMessage: 'Resource not found',
});

// Subclass with a fixed error code
export class MyNotFoundException extends RuntimeException {
  constructor(id: string) {
    super({
      httpStatus: HttpStatus.NOT_FOUND,
      message: 'Entity %s not found',
      messageParams: [id],
      fault: 'client',
    });
    this.errorCode = 'MY_NOT_FOUND_ERROR';
  }
}
```

Key options (`RuntimeExceptionOptions`):

| Option | Type | Description |
| --- | --- | --- |
| `message` | `string` | Internal (developer-facing) message. Supports `%s` via `util.format`. |
| `messageParams` | `unknown[]` | Interpolation values for `message`. |
| `safeMessage` | `string` | User-facing message. When set, it is used in the HTTP response body at any status. |
| `safeMessageParams` | `unknown[]` | Interpolation values for `safeMessage`. |
| `httpStatus` | `HttpStatus` | HTTP status code. Defaults to `500`. |
| `originalError` | `unknown` | Original error cause (wrapped into context). |
| `fault` | `'client' \| 'usage' \| 'internal'` | Who is at fault, independent of `httpStatus` — triage classification for logging/observability. Defaults to `'internal'` (the fail-loud fallback for an unclassified exception), so subclasses should set it explicitly. Never rendered on the wire — see HTTP Responses below. |

### HTTP Responses

No filter registration is needed. `RuntimeException` subclasses are
`HttpException`s, so NestJS's built-in exception handling renders the body
returned by `getResponse()`:

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "errorCode": "MY_NOT_FOUND_ERROR",
  "error": "Not Found"
}
```

`error` is the HTTP status text (omitted for unknown status codes). Message
resolution: when `safeMessage` is set, it is always used; without one,
statuses `>= 500` fall back to `'Internal Server Error'` (never the internal
message), and 4xx statuses use `message`. `fault` is deliberately absent from
the response body — it never reaches the wire.

## Schemas & OpenAPI

Zod v4 / Standard Schema schemas replace the former DTO classes. Base
schemas are composed into concrete entity schemas via `.extend()`:

| Export | Fields |
| --- | --- |
| `auditSchema` | `dateCreated`, `dateUpdated`, `dateDeleted` |
| `referenceIdSchema` | `id` |
| `mutableAggregateSchema` (from `./aggregate`) | audit fields + `id` + `version` |
| `appendOnlyAggregateSchema` (from `./aggregate`) | `id` + `dateCreated` |

### Interface Conformance

`conformsTo<Interface>()(schema)` is a compile-time assertion that a schema's
inferred output is assignable to a domain interface — replacing the old
`class Dto implements Interface` guarantee. Extra fields on the schema are
allowed; missing fields, wrong types, or optional-vs-nullable mismatches
fail to compile.

```ts
import { conformsTo } from '@concepta/nestjs-core';
import { mutableAggregateSchema } from '@concepta/nestjs-core/aggregate';
import { z } from 'zod';

export const cacheSchema = conformsTo<CacheInterface>()(
  mutableAggregateSchema.extend({
    key: z.string(),
    data: z.string().nullable(),
  }),
);
```

### OpenAPI Wiring

`withOpenApi(schema, id?)` attaches the `~standard.jsonSchema` extension so
`@nestjs/swagger` can render the schema as OpenAPI. It returns a **new**
schema instance (like Zod's other builder methods) — always use the return
value, never the schema passed in.

`withNamedComponent(schema, id)` additionally registers the schema in a
process-wide named-component registry, so every endpoint referencing the
same schema instance `$ref`s a single `components.schemas` entry. Component
ids are bare entity names (e.g. `Cache`). It throws at module-load time if
the id is already registered. Same caveat: use the return value.

`isStandardSchema(value)` is a type guard narrowing an `unknown` value to a
Zod (Standard Schema) schema.

Wire the converter when creating the OpenAPI document:

```ts
import { standardSchemaConverter } from '@concepta/nestjs-core';

const document = SwaggerModule.createDocument(app, config, {
  standardSchemaConverter,
});
```

Schemas registered via `withNamedComponent` render as named
`components.schemas` entries; any other schema falls through to the native
Standard Schema path and is inlined (this is how request body schemas are
documented automatically, with no decorator needed).

## Event Context

`EventContextHost<H, M>` is a frozen container of headers and metadata, used
as the first argument to aggregate factory methods and domain events. It
ensures the event-issuing context is captured immutably at the point of
command execution.

`headers` and `metadata` serve different roles. Headers are framework-owned
and auto-populated: every context carries `correlationId` (stable across a
whole causal chain), `causationId` (the inbound request/command that caused
this context to exist), and `recordedAt`, plus any per-package extension
such as `namespace`. Metadata is caller-supplied, per-event-type payload
extras — arbitrary typed data an event needs to carry that isn't part of the
uniform header set.

Because the causal headers are required, `EventContextHost` is not built
directly — `createEventContext` derives `correlationId`/`causationId` from
the ambient context (`ctx`) rather than accepting them as arguments:

```ts
import { createEventContext } from '@concepta/nestjs-core';

const eventContext = createEventContext(ctx, { namespace: 'my-module' }, {});

eventContext.getHeader('namespace');      // 'my-module'
eventContext.getHeader('correlationId');  // derived from ctx, or synthesized
eventContext.getHeader('recordedAt');     // Date
```

The correlation pair comes from a `CorrelationCtx` overlay attached to `ctx`
(see [Correlation Context](#correlation-context)) when one is present. If
not — a seed script, a bare unit test — `createEventContext` mints a fresh
self-correlated pair (`correlationId === causationId`), which is how such a
context is visibly distinguishable from a real request chain.

Metadata is passed as the third argument and read back with `getMeta`:

```ts
const eventContext = createEventContext(ctx, {}, { passcode, tokenExp });

eventContext.getMeta('passcode');  // typed
```

`EventContextHost` is frozen on construction — its `headers` and `metadata`
properties cannot be mutated. `H` is constrained to
`EventContextHeadersInterface`, so a context missing the causal headers
fails to compile.

## Aggregate (`@concepta/nestjs-core/aggregate` subpath)

```ts
import {
  MutableAggregate,
  AppendOnlyAggregate,
  DomainAggregate,
  DomainMapper,
  mutableAggregateSchema,
  appendOnlyAggregateSchema,
  AggregateMetaInterface,
  CorrectableInterface,
} from '@concepta/nestjs-core/aggregate';
```

Pick the aggregate that matches how the record is stored:

| Extend | When the record | Carries | Pairs with |
| --- | --- | --- | --- |
| `MutableAggregate` | changes over time | `version`, `dateCreated`, `dateUpdated`, `dateDeleted` | `writePolicy: { access: 'mutable' }`, `mutableAggregateSchema` |
| `AppendOnlyAggregate` | is written once, then only corrected by new records | `dateCreated` | `writePolicy: { access: 'append-only', reason }`, `appendOnlyAggregateSchema` |
| `DomainAggregate` | fits neither | nothing beyond `id` and props | whatever you add |

All three extend `@nestjs/cqrs` `AggregateRoot`, so every aggregate raises
domain events with `apply()`. Each one owns its dates: what `toPlain()` emits
is what gets stored.

### MutableAggregate

```ts
export class MyAggregate extends MutableAggregate<MyInterface> {
  constructor(
    id: string,
    props: MyInterface,
    version?: number,
    meta?: AggregateMetaInterface,
  ) {
    super(id, props, version, meta);
  }

  static create(eventContext: EventContextHost, dto: MyCreatable): MyAggregate {
    const agg = new MyAggregate(randomUUID(), dto);
    agg.apply(new MyCreatedEvent(eventContext, agg.toPlain()));
    return agg;
  }

  update(eventContext: EventContextHost, dto: Partial<MyCreatable>): void {
    this.props = { ...this.props, ...dto };
    this.incrementVersion();
    this.apply(new MyUpdatedEvent(eventContext, this.toPlain()));
  }
}
```

Inherited members:

| Member | Description |
| --- | --- |
| `id` | Read-only string identifier. |
| `version` | Integer version counter. |
| `meta` | `AggregateMetaInterface` — `dateCreated`, `dateUpdated`, `dateDeleted`. |
| `props` | Protected domain properties object. |
| `stampCreated()` | Sets `dateCreated` and `dateUpdated` to now. Called by `stampUpdated()` when `dateCreated` is unset. |
| `stampUpdated()` | Updates `dateUpdated`. Called by the repository before save. |
| `stampDeleted()` | Sets `dateDeleted`. Called by the repository before soft-delete. |
| `incrementVersion()` | Bumps the version. Call inside mutation methods. |
| `toPlain()` | Returns `{ id, version, ...props, ...meta }` — used as persistence payload. |

### AppendOnlyAggregate

```ts
export class LedgerEntry extends AppendOnlyAggregate<LedgerEntryProps> {
  static record(eventContext: EventContextHost, props: LedgerEntryProps): LedgerEntry {
    const entry = new LedgerEntry(randomUUID(), props);
    entry.apply(new LedgerEntryRecordedEvent(eventContext, entry.toPlain()));
    return entry;
  }
}
```

`dateCreated` is stamped at construction; pass it as the third constructor
argument when rebuilding from a row. `toPlain()` returns
`{ id, ...props, dateCreated }`, the same columns as an append-only base
entity, so a mapper can persist it as-is. There is no version, no updated or
deleted date, and no method that changes the record. To correct one, create a
new record that points at it (see `CorrectableInterface`).

### DomainAggregate

The base of both: `id`, protected `props`, domain events, and
`toPlain()` returning `{ id, ...props }`. Extend it directly only when neither
preset fits.

### DomainMapper

Abstract mapper that converts persistence entities to domain aggregates and
back. Implement both directions — `createAggregate(entity)` and
`toPersistence(aggregate)`; `toDomain` is inherited.

```ts
export class MyMapper extends DomainMapper<MyEntityInterface, MyAggregate> {
  createAggregate(entity: MyEntityInterface): MyAggregate {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } = entity;
    return new MyAggregate(id, props, version, { dateCreated, dateUpdated, dateDeleted });
  }

  toPersistence(aggregate: MyAggregate) {
    return aggregate.toPlain();
  }
}
```

When the stored row matches the props, `toPersistence` returns
`aggregate.toPlain()`. When it doesn't — a value object in props stored as
several columns — translate here; the return type is checked against the
entity, so a props-shaped object that doesn't fit fails to compile.

`Entity` is the stored row exactly as you declare it, including one with no
`version` or audit columns. An append-only row stores its lineage as two
nullable columns, and `createAggregate` is where they narrow into
`CorrectableInterface`, which allows only an original or a correction with a
reason:

```ts
type LedgerEntryProps = { amount: string } & CorrectableInterface;

interface LedgerEntryRow {
  id: string;
  dateCreated: Date;
  amount: string;
  correctedId: string | null;
  reason: string | null;
}

export class LedgerEntryMapper extends DomainMapper<LedgerEntryRow, LedgerEntry> {
  createAggregate(row: LedgerEntryRow): LedgerEntry {
    const { id, dateCreated, amount, correctedId, reason } = row;
    return new LedgerEntry(id, { amount, ...toLineage(correctedId, reason) }, dateCreated);
  }

  toPersistence(entry: LedgerEntry): LedgerEntryRow {
    return entry.toPlain();
  }
}

function toLineage(correctedId: string | null, reason: string | null): CorrectableInterface {
  if (correctedId === null && reason === null) return { correctedId: null, reason: null };
  if (correctedId !== null && reason !== null) return { correctedId, reason };
  throw new RuntimeException({ message: 'Correction lineage is malformed' });
}
```

The `nestjs-cache` package is the reference implementation for the full
aggregate + mapper + repository pattern.

## Money (`@concepta/nestjs-core/optional/money` subpath)

Exact monetary arithmetic. Install the optional peer `decimal.js` to use this
subpath; no other entry point needs it.

```ts
import { Money, Rounding } from '@concepta/nestjs-core/optional/money';

const fee = Money.of('1234.56', 'USD')
  .multiply('0.27')             // exact; nothing is rounded
  .round(Rounding.halfUp(2));   // 333.33 USD
```

### Building amounts

```ts
Money.of('1234.56', 'USD');        // ok
Money.of(1234.56, 'USD');          // refused
Money.fromNumber(1234.56, 'USD');  // explicit opt-in for a number you trust
```

Pass amounts as strings. A `number` carries no record of what has already
happened to it — `0.1 + 0.2` arrives as `0.30000000000000004` — so use
`fromNumber()` only when you have checked the value. Amounts are limited to
38 significant digits, the widest portable SQL `numeric`.

### Validating requests

```ts
const body = moneySchema.parse(request.body); // { amount: string; currency: string }
const price = Money.fromJSON(body);
```

A client must send `"100.5"`, not `100.5`: a JSON number fails validation.
When amount and currency arrive as separate fields, use `moneyAmountSchema`
and `currencyCodeSchema`. The schema does not check the amount's scale
against the currency — `{ amount: "1.005", currency: "USD" }` passes — so
round in the handler if that matters.

### Calculating

Nothing is rounded unless you call `round()`. `add`, `subtract` and
`multiply` keep full precision, and `divide()` requires a `Rounding`:

```ts
const total = price.multiply(3).add(shipping);  // quantity as a number
const fee = total.multiply('0.0275');           // rate as a string
const share = total.divide(4, Rounding.halfEven(2));
```

A rate is always a string: `multiply(0.0275)` compiles but throws, because a
fractional `number` is refused.

Rounding is always explicit — `Rounding.halfUp/halfDown/halfEven/up/down(scale)`,
with `scale` from 0 to 20. `halfUp` rounds half away from zero, so `-2.675`
becomes `-2.68`. Round to the currency's own minor unit with
`Rounding.halfUp(minorUnitsOf(fee.currency))`; for a mode read from
configuration, use `Rounding.of(scale, mode)`.

The usual JavaScript idioms disagree with each other, and neither rounds
half-up reliably:

| Value | `toFixed(2)` | `Math.round(v * 100) / 100` | `Money` half-up |
| --- | --- | --- | --- |
| `2.675` | `2.67` | `2.68` | `2.68` |
| `10.235` | `10.23` | `10.24` | `10.24` |
| `1.105` | `1.10` | `1.11` | `1.11` |

Arithmetic and ordering across currencies throw; `equals` across currencies
returns `false`.

### Splitting without losing a cent

```ts
Money.of('100.00', 'USD').allocate([1, 1, 1]);
// [33.34, 33.33, 33.33] — sums exactly to 100.00
```

The same inputs always produce the same split, and a negative amount splits
as the mirror of its positive. Any amount below the currency's minor unit is
dropped first, towards zero, so round first if it has to land somewhere.

### Persisting

`moneyAmountTransformer` is a column transformer for the amount column. Keep
the currency in its own column and build the `Money` in the entity's mapper.
It works anywhere TypeORM accepts a `ValueTransformer`.

```ts
// Postgres
@Column({ type: 'numeric', precision: 19, scale: 4, transformer: moneyAmountTransformer })
amount!: string;

// SQLite
@Column({ type: 'text', transformer: moneyAmountTransformer })
amount!: string;

@Column({ type: 'varchar', length: 3 })
currency!: string;
```

Declare the amount column `numeric` on Postgres and **`text`** on SQLite.
Never use `real` or `float`. On SQLite, `decimal`/`numeric` also come back
as JavaScript numbers with the precision already gone. If a column ever
returns a number, the transformer throws `MoneyColumnTypeException`, even if
a later migration changed the column type.

To hold a `Money` in an aggregate, split it into those columns in the
mapper, rounded to the column's scale:

```ts
toPersistence(invoice: Invoice) {
  const { fee, ...rest } = invoice.toPlain();
  return { ...rest, amount: fee.round(Rounding.halfUp(4)).toFixed(), currency: fee.currency };
}
```

and rebuild it in `createAggregate` with `Money.of(amount, currency)`.
Round to the column's scale so the value you store is the value you read
back. A nullable amount column reads back as `null`; handle that before
calling `Money.of`.

### Returning and displaying

```ts
// API response — the exact value, without trailing zeros
Money.of('12.50', 'USD').toJSON();  // { amount: "12.5", currency: "USD" }

// Display — rounded and padded to the currency's scale
const scale = minorUnitsOf(price.currency);
price.round(Rounding.halfUp(scale)).toFixed(scale);  // "12.50"
```

`toFixed(scale)` pads but never rounds: an amount with more places than the
scale is refused, so round first.

### Currencies

`minorUnitsOf` returns a currency's ISO 4217 minor unit — 2 for `USD`, 0 for
`JPY`, 3 for `KWD`. About thirty widely used currencies are built in; any
other code is refused rather than defaulted to two places. Add the ones you
need at the top of `main.ts`, before `NestFactory.create`:

```ts
configureCurrencies({ ISK: 0, VND: 0 });
```

Pass `{ mode: 'replace' }` to accept only the table you give. Calling it
again, or after any currency has been looked up, throws
`CurrencyConfigurationException`. In tests, `resetCurrencies()` from
`@concepta/nestjs-core/testing` restores the built-in set; that entry point
also needs the optional peer `vitest-mock-extended` installed.

### Errors

| Exception | Status | When | What to do |
| --- | --- | --- | --- |
| `MoneyInvalidAmountException` | 400 | An unreadable amount, a `number` passed to `of()`, a fractional rate, division by zero, invalid weights, or `toFixed` that would round | Pass a decimal string; round before formatting |
| `CurrencyUnknownException` | 400 | A currency that isn't configured | Validate request input with `moneySchema` first; add currencies you support with `configureCurrencies` |
| `CurrencyMismatchException` | 400 | Arithmetic or ordering across two currencies | Convert first; compare like with like |
| `CurrencyConfigurationException` | 500 | `configureCurrencies` called twice, late, or with a bad table | Call it once at the top of `main.ts` |
| `MoneyColumnTypeException` | 500 | A column returned a number | Declare it `numeric` (Postgres) or `text` (SQLite) |
| `RuntimeException` | 500 | A rounding or format scale outside 0–20, or text that is not a rounding mode | Fix the scale or mode in code or configuration |

## Testing (`@concepta/nestjs-core/testing` subpath)

```ts
import {
  createMockEventPublisher,
  createMockCommandBus,
  createMockQueryBus,
  collectRuntimeExceptionClassNames,
  createTestEventContext,
} from '@concepta/nestjs-core/testing';
```

`createMockEventPublisher`, `createMockCommandBus`, and `createMockQueryBus`
each return a `vitest-mock-extended` `DeepMockProxy` of the corresponding CQRS
class. `createMockEventPublisher` additionally pre-wires `mergeObjectContext`
to return its argument unchanged, matching real runtime behavior.

```ts
import { Test } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { createMockEventPublisher } from '@concepta/nestjs-core/testing';

const moduleRef = await Test.createTestingModule({
  providers: [MyHandler],
})
  .overrideProvider(EventPublisher)
  .useValue(createMockEventPublisher())
  .compile();
```

`collectRuntimeExceptionClassNames(srcDir, runtimeExceptionClass)` is a
different kind of helper — not a mock. It discovers every `RuntimeException`
subclass exported from a `*.exception.ts` file under `srcDir`, by dynamically
importing each file and walking its prototype chain. Packages use it in a
per-package `exception-fault.spec.ts` suite to assert every exception class
sets a `fault`, so a new exception can't silently ship unclassified.

`createTestEventContext(extraHeaders, metadata)` builds an `EventContextHost`
with a fixed, deterministic `correlationId`/`causationId`/`recordedAt` —
for tests that need a valid context to satisfy the compile guard but don't
exercise correlation behavior directly.

## API Reference

### Module

| Export | Description |
| --- | --- |
| `CoreModule` | The root module. Registers a global `APP_INTERCEPTOR` for hook context and exports `HookResolverService`. |

### Hook Decorators

| Export | Description |
| --- | --- |
| `@UseHooks(...hooks)` | Controller/method decorator. Attaches hook classes to the handler. |
| `@Hook(options)` | Class decorator. Marks a class as a hook, applies `@Injectable()`, and pre-computes method mappings. |
| `@Specification(spec)` | Class/method decorator. Attaches a default specification to a hook class or method. |
| `createHookMethodDecorator(key)` | Factory for creating subsystem-specific hook method decorators (e.g. `@BeforeFind`). |

### Hook Runtime

| Export | Description |
| --- | --- |
| `HookResolverService` | Resolves and executes hook methods for a given hook type and method key. |
| `HooksCtx` | `OverlayRef` token for the hook context. Use with `ctx.with(HooksCtx)` or `@Ctx(HooksCtx)`. |
| `HookNotDecoratedException` | Thrown by `@UseHooks()` when a class passed to it is missing the class-level `@Hook()` decorator (error code `HOOK_NOT_DECORATED`). |
| `HookProviderNotFoundException` | Thrown when a hook registered via `@UseHooks()` cannot be resolved from the module's providers (error code `HOOK_PROVIDER_NOT_FOUND`). |

### Hook Types and Interfaces

| Export | Description |
| --- | --- |
| `SpecificationInterface<Ctx>` | Contract: `isSatisfiedBy(context): boolean`. |
| `HookOption` | Union: a bare hook class, or a `HookWithSpec` configuration object. |
| `HookWithSpec` | `{ hook, type? }` — a hook class with its subsystem type, which is always read from the class's `@Hook()`. Gating specs go on the hook itself. |
| `HookTypeInterface` | Interface for hook type constants. Requires `readonly KEY: string`. |
| `HookContextInterface` | Request-scoped context carrying the resolved `hooks: HookWithSpec[]` array. |
| `HookMethodKeyType` | String key that identifies a hook method slot (e.g. `'beforeFind'`). |

### Specification Classes

| Export | Description |
| --- | --- |
| `Spec` | Factory for common specifications: `always()`, `never()`, `and()`, `or()`, `not()`. |
| `CompositeSpecification<Ctx>` | Abstract base for custom composite specifications. |
| `AlwaysSpecification` | Always returns `true`. |
| `NeverSpecification` | Always returns `false`. |
| `AndSpecification` | Returns `true` if both left and right specs are satisfied. |
| `OrSpecification` | Returns `true` if either left or right spec is satisfied. |
| `NotSpecification` | Negates the wrapped specification. |

### Context System Exports

| Export | Description |
| --- | --- |
| `AppContextHost` | Per-request overlay container. Use `defineOverlay`, `removeOverlay`, `with`, `require`, `supports`, `optional`. Static `from(value?)` coerces `AppContextLike` to a host — it throws on a non-empty plain object, so pass a real host rather than `{ tenantId }`. |
| `OverlayDefineOptionsInterface` | Third argument to `defineOverlay`. `{ immutable: true }` protects the overlay from removal, redefinition, and shadowing. |
| `getAppContext(request)` | Returns the `AppContextHost` for a request, creating one on first access. |
| `Ctx` | Parameter decorator. Without args: injects the raw `AppContextHost`. With an `OverlayRef`: unwraps the overlay via `appCtx.with(ref)`. |
| `OverlayRef` | Typed token for a named overlay. Construct with `new OverlayRef<Name, Props>('withName')`. |
| `ContextOverlayInterceptor` | Abstract base for custom overlays. Subclasses implement `ref` and `attach()`. |
| `OverlayNotDefinedException` | Thrown when `with(ref)` is called for an overlay that was not defined on the context. |
| `OverlayImmutableException` | Thrown when an overlay defined `{ immutable: true }` is redefined or shadowed on a child. |
| `OverlayAlreadyDefinedException` | Thrown when `{ immutable: true }` is requested but a mutable overlay of that name already exists. |
| `AppContextInterface` | Interface implemented by `AppContextHost`. |
| `AppContextLike` | Type accepted by `AppContextHost.from()` — either an `AppContextHost` or a nullish/empty plain object. |
| `CorrelationCtx` | `OverlayRef` token for the correlation overlay. Use with `ctx.with(CorrelationCtx)` or `@Ctx(CorrelationCtx)`. |
| `CorrelationContextOverlay` | Seeds `correlationId`/`causationId` from the `x-correlation-id` request header. Registered by `CoreModule`. |
| `CorrelationContextInterface` | Shape of the resolved overlay: `{ correlationId, causationId }`. |

### Exceptions Exports

| Export | Description |
| --- | --- |
| `RuntimeException` | Base domain exception. Extends NestJS `HttpException`; composes the wire body `{ statusCode, message, errorCode, error? }` lazily in `getResponse()`. Accepts `httpStatus`, `safeMessage`, `messageParams`, `originalError`, `fault`. |
| `RuntimeExceptionInterface` | Interface for `RuntimeException`. |
| `RuntimeExceptionOptions` | Options bag for the `RuntimeException` constructor. |
| `RuntimeExceptionContext` | Type of the `context` property on `RuntimeException`. Defined as `ExceptionContext & { originalError?: Error }`. |
| `RuntimeExceptionFault` | String union `'client' \| 'usage' \| 'internal'` classifying who is at fault. |
| `ExceptionContext` | Base context shape: `Record<string, unknown> & { originalError?: unknown }`. Extended by `RuntimeExceptionContext`. |
| `ExceptionInterface` | Minimal interface: `errorCode`, `context?`. Extends `Error`. |
| `NotAnErrorException` | Wraps a non-`Error` value (e.g. a string or object) into an `Error`. Used internally by `mapNonErrorToException`. |

### Event Context Exports

| Export | Description |
| --- | --- |
| `EventContextHost<H, M>` | Frozen container of `headers: H` and `metadata: M`. Passed as first arg to aggregate factories and domain events. Provides `getHeader(key)` and `getMeta(key)`. |
| `EventContextInterface<H, M>` | Interface implemented by `EventContextHost` — declares `headers`, `metadata`, `getHeader(key)`, `getMeta(key)`. |
| `EventContextHeadersInterface` | Required header shape: `correlationId`, `causationId`, `recordedAt`. Per-package headers extend this. |
| `createEventContext(ctx, extraHeaders, metadata)` | Builds an `EventContextHost`, deriving `correlationId`/`causationId` from `ctx`'s `CorrelationCtx` overlay (or synthesizing a self-correlated pair). Never throws, even on an unusual `ctx` shape. |
| `createCausalContext(resolver, extraHeaders, metadata)` | The framework-agnostic algorithm `createEventContext` delegates to — resolves or synthesizes a correlation pair via a `CausalContextResolver`, with no `AppContextHost` involved. |
| `CausalContextResolver` | Port abstracting over where the correlation pair lives — `resolve()` returns a pair or `undefined`; `memoize(pair)` records a synthesized one. |
| `CausalPairInterface` | `{ correlationId, causationId }` — the shape resolved and memoized by a `CausalContextResolver`. |
| `AppContextHostCausalResolver` | `CausalContextResolver` implementation backed by an `AppContextHost`'s `CorrelationCtx` overlay. Used internally by `createEventContext`. |

### Reference Types

| Export | Description |
| --- | --- |
| `ReferenceId` | Branded `string` type for entity IDs. |
| `ReferenceActive` | Branded `boolean` for active/inactive flag. |
| `ReferenceEmail` | Branded `string` for email addresses. |
| `ReferenceUsername` | Branded `string` for usernames. |
| `ReferenceSubject` | Branded `string` for JWT/auth subjects. |
| `ReferenceAssignment` | Branded `string` for role/scope assignment values. |
| `ReferenceIdInterface` | Interface with `id: ReferenceId`. |
| `ReferenceActiveInterface` | Interface with `active: ReferenceActive`. |
| `ReferenceEmailInterface` | Interface with `email: ReferenceEmail`. |
| `ReferenceUsernameInterface` | Interface with `username: ReferenceUsername`. |
| `ReferenceSubjectInterface` | Interface with `subject: ReferenceSubject`. |
| `ReferenceVersionInterface` | Interface with `version: number`. |

### Audit Types

| Export | Description |
| --- | --- |
| `AuditDateCreated` | Branded `Date \| null` for creation timestamp. |
| `AuditDateUpdated` | Branded `Date \| null` for last-update timestamp. |
| `AuditDateDeleted` | Branded `Date \| null` for soft-deletion timestamp. |
| `AuditVersion` | Branded `number` for optimistic-lock version. |
| `AuditInterface` | Interface with `dateCreated`, `dateUpdated`, `dateDeleted`. |
| `AuditDateCreatedInterface` | Interface with `dateCreated: AuditDateCreated`. |
| `AuditDateUpdatedInterface` | Interface with `dateUpdated: AuditDateUpdated`. |
| `AuditDateDeletedInterface` | Interface with `dateDeleted: AuditDateDeleted`. |
| `AuditVersionInterface` | Interface with `version: AuditVersion`. |

### Enums and Operation Types

| Export | Description |
| --- | --- |
| `ActionEnum` | Enum of CRUD action names (`CREATE`, `READ`, `UPDATE`, `DELETE`). |
| `Operation` | String enum of the nine operations: `List`, `Read`, `Create`, `CreateBatch`, `Update`, `Replace`, `Delete`, `SoftDelete`, `Restore`. |
| `ReadOperations` | Read-only tuple `[List, Read]`. |
| `WriteOperations` | Read-only tuple `[Create, CreateBatch, Update, Replace]`. |
| `MutateOperations` | Read-only tuple of `WriteOperations` plus `Delete`, `SoftDelete`, `Restore`. |
| `ReadOperation` | Union of the `ReadOperations` members. |
| `WriteOperation` | Union of the `WriteOperations` members. |
| `MutateOperation` | Union of the `MutateOperations` members. |

### Utilities and Module Helpers

| Export | Description |
| --- | --- |
| `createSettingsProvider` | Factory that creates a NestJS `Provider` wiring module options to a settings token, with optional transformer support. |
| `mapNonErrorToException` | Converts any non-`Error` value to a `NotAnErrorException`; passes through real `Error` instances unchanged. |
| `toMilliseconds` | Converts a duration string (e.g. `'1h'`) or number to milliseconds via the `ms` library. Accepts an optional third `fault` argument classifying an unparseable value on the thrown `RuntimeException` (defaults to `'internal'`). |
| `isNil`, `isUndefined`, `isString`, `isNumber`, `isObject` | Narrowing type guards. Rockets-owned replacements for the unpublished `@nestjs/common/utils/shared.utils` internals. |
| `DeepPartial<T>` | Recursive `Partial<T>`. |
| `DomainFactory<Creatable, Domain>` | Interface enforcing `create` and `createWithId` static factory signatures on domain aggregate classes. |
| `AssigneeRelationInterface` | Interface for entities that hold an `assignee` relation (`{ assignee: ReferenceIdInterface }`). |
| `ModuleOptionsSettingsInterface<T>` | Interface for module options that include a `settings` block and optional `settingsTransform`. |
| `ModuleOptionsControllerInterface` | Interface for module options that control whether HTTP endpoints are enabled. |

### Schemas and OpenAPI Utilities

| Export | Description |
| --- | --- |
| `auditSchema` | Zod schema for audit fields (`dateCreated`, `dateUpdated`, `dateDeleted`). Composed into entity schemas via `.extend()`. |
| `referenceIdSchema` | Zod schema exposing a single `id` field. Composed into entity schemas via `.extend()`. |
| `conformsTo<Interface>()` | Compile-time assertion that a schema's inferred output conforms to a domain interface. |
| `withOpenApi(schema, id?)` | Attaches the `~standard.jsonSchema` extension for OpenAPI conversion. Returns a new schema instance — use the return value. |
| `withNamedComponent(schema, id)` | Registers a named, reusable `components.schemas` entry. Throws on duplicate id. Use the return value. |
| `standardSchemaConverter` | Document-level converter for `SwaggerModule.createDocument(app, config, { standardSchemaConverter })`. |
| `isStandardSchema(value)` | Type guard: `true` if `value` is a Standard Schema (Zod) schema. |

### Subpath: `./aggregate`

| Export | Description |
| --- | --- |
| `MutableAggregate<T>` | Aggregate for a record that changes: `version`, audit dates, `stamp*()`, `incrementVersion()`. |
| `AppendOnlyAggregate<T>` | Aggregate for a record written once: `dateCreated` only. |
| `DomainAggregate<T>` | Base of both: `id`, `props`, domain events (`@nestjs/cqrs` `AggregateRoot`). |
| `DomainMapper<Entity, Agg>` | Abstract mapper base. Implement `createAggregate(entity)` and `toPersistence(aggregate)`. |
| `mutableAggregateSchema` | Zod schema exposing `id`, `version`, and audit fields. Composed into entity schemas via `.extend()`. |
| `appendOnlyAggregateSchema` | Zod schema exposing `id` and `dateCreated`. Composed into entity schemas via `.extend()`. |
| `AggregateMetaInterface` | Interface for aggregate audit timestamps: `dateCreated`, `dateUpdated`, `dateDeleted`. |
| `CorrectableInterface` | Domain props for a record that is an original or a correction of one: `{ correctedId: null; reason: null }` or `{ correctedId: string; reason: string }`. Intersect it into an aggregate's props type. |

### Subpath: `./optional/money`

Requires the optional peer `decimal.js`.

| Export | Description |
| --- | --- |
| `Money` | Immutable exact amount in one currency: `of`, `fromNumber`, `zero`, `fromJSON`; `add`, `subtract`, `multiply`, `divide`, `negate`, `abs`, `round`, `allocate`; comparison and sign checks; `toFixed`, `toJSON`. |
| `Rounding` | Rounding mode plus scale (0–20): `halfUp`, `halfDown`, `halfEven`, `up`, `down`, or `of(scale, mode)` for a mode chosen at runtime. |
| `RoundingMode` | String enum of the five modes. |
| `MoneyInterface` | Transport shape `{ amount: string; currency: string }`. |
| `configureCurrencies(table, options?)` | Set the accepted currencies once at startup; `mode: 'extend'` (default) or `'replace'`. |
| `minorUnitsOf(code)` | ISO 4217 minor units of a configured currency. |
| `isKnownCurrency(code)` / `assertKnownCurrency(code)` | Check whether a currency is configured, or refuse one that isn't. |
| `CurrencyTable`, `ConfigureCurrenciesOptions` | Types for `configureCurrencies`. |
| `moneySchema`, `moneyAmountSchema`, `currencyCodeSchema` | Zod schemas for the transport shape and its two fields. |
| `moneyAmountTransformer`, `ColumnTransformerInterface` | Amount-column transformer, structurally compatible with TypeORM's `ValueTransformer`. |
| `MoneyInvalidAmountException` | An amount, factor or weight that cannot be read exactly (400). |
| `CurrencyUnknownException` | A currency code that is not configured (400). |
| `CurrencyMismatchException` | Arithmetic or ordering across two currencies (400). |
| `CurrencyConfigurationException` | `configureCurrencies` called twice, after first use, or with an invalid table (500). |
| `MoneyColumnTypeException` | A column returned a number, so precision is already lost (500). |

### Subpath: `./testing`

| Export | Description |
| --- | --- |
| `createMockEventPublisher()` | Returns a `DeepMockProxy<EventPublisher>` with `mergeObjectContext` pre-wired to return its argument. |
| `createMockCommandBus()` | Returns a `DeepMockProxy<CommandBus>`. |
| `createMockQueryBus()` | Returns a `DeepMockProxy<QueryBus>`. |
| `collectRuntimeExceptionClassNames(srcDir, runtimeExceptionClass)` | Discovers every `RuntimeException` subclass under `srcDir` by dynamic import and prototype walk. |
| `createTestEventContext(extraHeaders, metadata)` | Builds an `EventContextHost` with a fixed, deterministic correlation pair for tests that don't exercise correlation directly. |
| `resetCurrencies()` | Restores the built-in currencies and allows `configureCurrencies` again. |
