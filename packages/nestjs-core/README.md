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
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

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
| `@concepta/nestjs-core/aggregate` | `DomainAggregate`, `DomainMapper`, `domainAggregateSchema`, `AggregateMetaInterface`. |
| `@concepta/nestjs-core/testing` | `createMockEventPublisher`, `createMockCommandBus`, `createMockQueryBus`, `collectRuntimeExceptionClassNames`. |

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
    ctx?: AppContextInterface,
  ): Promise<RepositoryFindOptions<OrderEntity>> {
    const tenant = ctx?.supports(TenantCtx) ? ctx.with(TenantCtx) : undefined;
    if (!tenant) return options;

    const condition = Where.eq('tenantId', tenant.tenantId);
    return {
      ...options,
      where: options.where ? Where.and(options.where, condition) : condition,
    };
  }
}
```

Forgetting `@Hook()` is a hard failure, not a silent no-op: a class registered
via `@UseHooks()` without the class-level `@Hook()` decorator throws
`HookNotDecoratedException` at resolution time, and a hook that can't be
resolved from the module's providers throws `HookProviderNotFoundException`.
There is no equivalent hard failure for the two steps below — omitting
either one leaves the hook silently inert, no error, no warning:

1. **`CoreModule.forRoot()`** must be imported — it provides
   `HookResolverService` and the interceptor that populates hook state on
   the request context.
2. **The hook class must be listed in `providers`** for DI to resolve it.

### Attaching Hooks to Controllers

`@UseHooks(...hooks)` is applied to a controller class or a specific method.
Method-level decorators are merged with class-level decorators. This is the
third required step — see `@concepta/nestjs-repository`'s README, "Wiring
Hooks", for the full three-step checklist with a non-HTTP alternative.

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

`@UseHooks` also accepts `{ hook, spec }` objects to add a per-registration
specification guard:

```ts
@UseHooks(
  { hook: TenantScopeHook, spec: Spec.always() },
  { hook: AuditHook, spec: Spec.and(adminSpec, mutationSpec) },
)
@Controller('orders')
export class OrderController { ... }
```

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
injection. It resolves and executes the matching hook methods from the request
context, passing the payload through each applicable hook in sequence.

```ts
import {
  HookResolverService,
  getAppContext,
} from '@concepta/nestjs-core';
import { RepoHook } from '@concepta/nestjs-repository';

@Injectable()
export class SomeService {
  constructor(private readonly hookResolver: HookResolverService) {}

  async findAll(req: Request, options: FindOptions): Promise<FindOptions> {
    const ctx = getAppContext(req);
    // hookType is the decorator object (has KEY property); payload is what flows
    // through hooks; ctx is the full app context (resolver reads ctx.hooks internally).
    return this.hookResolver.execute(RepoHook, 'beforeFind', options, ctx);
  }
}
```

`execute<T>(hookType, methodKey, payload, ctx)` returns the payload after all
applicable hooks have processed it.

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
| `domainAggregateSchema` (from `./aggregate`) | audit fields + `id` + `version` |

### Interface Conformance

`conformsTo<Interface>()(schema)` is a compile-time assertion that a schema's
inferred output is assignable to a domain interface — replacing the old
`class Dto implements Interface` guarantee. Extra fields on the schema are
allowed; missing fields, wrong types, or optional-vs-nullable mismatches
fail to compile.

```ts
import { conformsTo, domainAggregateSchema } from '@concepta/nestjs-core';
import { z } from 'zod';

export const cacheSchema = conformsTo<CacheInterface>()(
  domainAggregateSchema.extend({
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
  DomainAggregate,
  DomainMapper,
  domainAggregateSchema,
  AggregateMetaInterface,
} from '@concepta/nestjs-core/aggregate';
```

### DomainAggregate

Abstract base class for all v8 domain aggregates. Extends
`@nestjs/cqrs` `AggregateRoot` (event sourcing support).

```ts
export class MyAggregate extends DomainAggregate<MyInterface> {
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
| `stampCreated()` | Sets `dateCreated` and `dateUpdated` to now. Called by the repository. |
| `stampUpdated()` | Updates `dateUpdated`. Called by the repository before save. |
| `stampDeleted()` | Sets `dateDeleted`. Called by the repository before soft-delete. |
| `incrementVersion()` | Bumps the version. Call inside mutation methods. |
| `toPlain()` | Returns `{ id, version, ...props, ...meta }` — used as persistence payload. |

### DomainMapper

Abstract mapper that converts persistence entities to domain aggregates and
back. Implement `createAggregate(entity)` — `toDomain` and `toPersistence`
are inherited.

```ts
export class MyMapper extends DomainMapper<MyEntityInterface, MyInterface, MyAggregate> {
  createAggregate(entity: MyEntityInterface): MyAggregate {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } = entity;
    return new MyAggregate(id, props, version, { dateCreated, dateUpdated, dateDeleted });
  }
}
```

The `nestjs-cache` package is the reference implementation for the full
aggregate + mapper + repository pattern.

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
| `@UseHooks(...hooks)` | Controller/method decorator. Attaches hook classes (or `{ hook, spec }` objects) to the handler. |
| `@Hook(options)` | Class decorator. Marks a class as a hook, applies `@Injectable()`, and pre-computes method mappings. |
| `@Specification(spec)` | Class/method decorator. Attaches a default specification to a hook class or method. |
| `createHookMethodDecorator(key)` | Factory for creating subsystem-specific hook method decorators (e.g. `@BeforeFind`). |

### Hook Runtime

| Export | Description |
| --- | --- |
| `HookResolverService` | Resolves and executes hook methods for a given hook type and method key. |
| `HooksCtx` | `OverlayRef` token for the hook context. Use with `ctx.with(HooksCtx)` or `@Ctx(HooksCtx)`. |
| `HookNotDecoratedException` | Thrown when a class passed to `@UseHooks()` is missing the class-level `@Hook()` decorator (error code `HOOK_NOT_DECORATED`). |
| `HookProviderNotFoundException` | Thrown when a hook registered via `@UseHooks()` cannot be resolved from the module's providers (error code `HOOK_PROVIDER_NOT_FOUND`). |

### Hook Types and Interfaces

| Export | Description |
| --- | --- |
| `SpecificationInterface<Ctx>` | Contract: `isSatisfiedBy(context): boolean`. |
| `HookOption` | Union: a bare hook class, or a `HookWithSpec` configuration object. |
| `HookWithSpec` | `{ hook, type?, spec? }` — a hook class paired with an optional spec guard. |
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
| `AppContextHost` | Per-request overlay container. Use `defineOverlay`, `removeOverlay`, `with`, `require`, `supports`, `optional`. Static `from(value?)` coerces `AppContextLike` to a host. |
| `getAppContext(request)` | Returns the `AppContextHost` for a request, creating one on first access. |
| `Ctx` | Parameter decorator. Without args: injects the raw `AppContextHost`. With an `OverlayRef`: unwraps the overlay via `appCtx.with(ref)`. |
| `OverlayRef` | Typed token for a named overlay. Construct with `new OverlayRef<Name, Props>('withName')`. |
| `ContextOverlayInterceptor` | Abstract base for custom overlays. Subclasses implement `ref` and `attach()`. |
| `OverlayNotDefinedException` | Thrown when `with(ref)` is called for an overlay that was not defined on the context. |
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
| `Operation` | String-literal union of all operation names. |
| `ReadOperations` | String-literal union of read-only operation names. |
| `WriteOperations` | String-literal union of write operation names. |
| `MutateOperations` | String-literal union of mutating operation names. |
| `ReadOperation` | Branded string for a read operation value. |
| `WriteOperation` | Branded string for a write operation value. |
| `MutateOperation` | Branded string for a mutating operation value. |

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
| `DomainAggregate<T>` | Abstract aggregate base extending `@nestjs/cqrs` `AggregateRoot`. |
| `DomainMapper<Entity, Props, Agg>` | Abstract mapper base. Implement `createAggregate(entity)`. |
| `domainAggregateSchema` | Zod schema exposing `id`, `version`, and audit fields. Composed into entity schemas via `.extend()`. |
| `AggregateMetaInterface` | Interface for aggregate audit timestamps: `dateCreated`, `dateUpdated`, `dateDeleted`. |

### Subpath: `./testing`

| Export | Description |
| --- | --- |
| `createMockEventPublisher()` | Returns a `DeepMockProxy<EventPublisher>` with `mergeObjectContext` pre-wired to return its argument. |
| `createMockCommandBus()` | Returns a `DeepMockProxy<CommandBus>`. |
| `createMockQueryBus()` | Returns a `DeepMockProxy<QueryBus>`. |
| `collectRuntimeExceptionClassNames(srcDir, runtimeExceptionClass)` | Discovers every `RuntimeException` subclass under `srcDir` by dynamic import and prototype walk. |
| `createTestEventContext(extraHeaders, metadata)` | Builds an `EventContextHost` with a fixed, deterministic correlation pair for tests that don't exercise correlation directly. |
