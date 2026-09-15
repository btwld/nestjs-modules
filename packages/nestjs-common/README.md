# @concepta/nestjs-common

Core dependency for all Rockets modules. Provides the DDD aggregate
infrastructure, audit system, domain interfaces, context overlay system,
exception handling, and shared DTOs.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-common)](https://www.npmjs.com/package/@concepta/nestjs-common)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-common)](https://www.npmjs.com/package/@concepta/nestjs-common)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/rockets/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Entry Points](#entry-points)
- [Domain Aggregates](#domain-aggregates)
- [Domain Mapper](#domain-mapper)
- [Domain Factory](#domain-factory)
- [Audit System](#audit-system)
- [Reference Interfaces](#reference-interfaces)
- [Context Overlay System](#context-overlay-system)
- [Event Context](#event-context)
- [Exceptions](#exceptions)
- [Utilities](#utilities)
- [Module Configuration](#module-configuration)
- [DTOs](#dtos)
- [Model Exceptions and Interfaces](#model-exceptions-and-interfaces)
- [Domain Interfaces](#domain-interfaces)

## Installation

```sh
yarn add @concepta/nestjs-common
```

## Entry Points

| Path | Description |
| --- | --- |
| `@concepta/nestjs-common` | Main entry -- DTOs, interfaces, enums, utilities |
| `@concepta/nestjs-common/aggregate` | Aggregate infrastructure -- `DomainAggregate`, `DomainMapper`, `DomainAggregateDto`, `AggregateMetaInterface` |
| `@concepta/nestjs-common/testing` | `createMockEventPublisher`, `createMockCommandBus`, `createMockQueryBus` |

## Domain Aggregates

`DomainAggregate<T>` is the base class for all domain entities. It extends
`AggregateRoot` from `@nestjs/cqrs` and adds versioning, audit metadata,
and a `toPlain()` serialization method.

```ts
import { DomainAggregate, AggregateMetaInterface } from '@concepta/nestjs-common/aggregate';

export class Order extends DomainAggregate<OrderInterface> {
  constructor(
    id: string,
    props: OrderInterface,
    version?: number,
    meta?: AggregateMetaInterface,
  ) {
    super(id, props, version, meta);
  }

  get status() {
    return this.props.status;
  }

  cancel(eventContext): void {
    this.props = { ...this.props, status: 'cancelled' };
    this.incrementVersion();
    this.apply(new OrderCancelledEvent(eventContext, this.toPlain()));
  }
}
```

### Inherited API

| Member | Description |
| --- | --- |
| `id` | Immutable unique identifier |
| `version` | Optimistic concurrency version (starts at 1) |
| `meta` | `AggregateMetaInterface` -- `dateCreated`, `dateUpdated`, `dateDeleted` |
| `props` | Domain properties (protected, update via spread) |
| `stampCreated()` | Set creation timestamp |
| `stampUpdated()` | Set update timestamp |
| `stampDeleted()` | Mark as soft-deleted |
| `incrementVersion()` | Bump version (protected) |
| `toPlain()` | Returns `{ id, version, ...props, ...meta }` |

## Domain Mapper

`DomainMapper<Entity, Props, Aggregate>` bridges persistence entities and
domain aggregates. Concrete mappers implement `createAggregate()` and are
registered as NestJS providers, injected into repositories.

```ts
import { DomainMapper } from '@concepta/nestjs-common/aggregate';

export class OrderMapper extends DomainMapper<
  OrderEntityInterface,
  OrderInterface,
  Order
> {
  createAggregate(entity: OrderEntityInterface): Order {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } =
      entity;
    return new Order(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }
}
```

| Method | Description |
| --- | --- |
| `createAggregate(entity)` | Abstract -- hydrate an aggregate from a persistence entity |
| `toDomain(entity)` | Calls `createAggregate()` |
| `toPersistence(aggregate)` | Calls `aggregate.toPlain()` |

## Domain Factory

`DomainFactory<Creatable, Domain>` constrains aggregate classes to expose
static `create()` and `createWithId()` factory methods with event context:

```ts
import { DomainFactory, EventContextInterface } from '@concepta/nestjs-common';

// Enforced via `satisfies` after the class declaration
Order satisfies DomainFactory<OrderCreatableInterface, Order>;
```

## Audit System

### AuditInterface

Combines three date interfaces for persistence tracking:

```ts
interface AuditInterface
  extends AuditDateCreatedInterface,
    AuditDateUpdatedInterface,
    AuditDateDeletedInterface {}
```

| Interface | Type |
| --- | --- |
| `AuditDateCreatedInterface` | `{ dateCreated: Date }` |
| `AuditDateUpdatedInterface` | `{ dateUpdated: Date }` |
| `AuditDateDeletedInterface` | `{ dateDeleted: Date \| null }` |

### AuditDto

DTO with `@Expose()` decorators for `dateCreated`, `dateUpdated`, and
`dateDeleted`. Used as a base class for entity DTOs.

### AggregateMetaInterface

Extends `AuditInterface`. Carried by `DomainAggregate` instances for
audit tracking.

## Reference Interfaces

Small, composable interfaces for common entity fields:

| Interface | Field |
| --- | --- |
| `ReferenceIdInterface` | `id: string` |
| `ReferenceVersionInterface` | `version: number` |
| `ReferenceEmailInterface` | `email: string` |
| `ReferenceUsernameInterface` | `username: string` |
| `ReferenceActiveInterface` | `active: boolean` |
| `ReferenceAssigneeInterface` | `assigneeId: string` |
| `ReferenceAssignmentInterface` | `assignment: string` |
| `ReferenceSubjectInterface` | `subject: string` |
| `ReferenceUserInterface` | `userId: string` |
| `ReferenceRoleInterface` | `role: string` |
| `ReferenceRolesInterface` | `roles: string[]` |

## Context Overlay System

`AppContextHost` is a per-request container that carries feature-specific
context through the NestJS request pipeline. Interceptors define **overlays**
early in the pipeline (e.g. namespace, transaction), and downstream
handlers consume them via typed `with*()` methods. A `Proxy` guard throws
`OverlayNotDefinedException` if you call an undefined `with*` method,
catching misconfiguration at runtime.

### Defining an Overlay

This walkthrough creates a `withFoo` overlay end-to-end.

#### Step 1: Define the context interface and OverlayRef

`OverlayRef` is a typed token that carries the method name and its resolved
type. It serves as the single source of truth for one overlay.

```ts
// foo-context.interface.ts
import { PlainLiteralObject } from '@nestjs/common';

export interface FooContextInterface extends PlainLiteralObject {
  namespace: string;
}
```

```ts
// foo-context.overlay.ts (partial -- ref only)
import { OverlayRef } from '@concepta/nestjs-common';
import { FooContextInterface } from './foo-context.interface';

export const FooCtx = new OverlayRef<'withFoo', FooContextInterface>('withFoo');
```

#### Step 2: Extend ContextOverlayInterceptor

`ContextOverlayInterceptor` is an abstract base class. Subclasses provide:

- **`ref`** -- the `OverlayRef` token
- **`attach(context)`** -- resolves overlay values, gets `AppContextHost`,
  and calls `defineOverlay(ref, values)`.

Since the overlay IS an interceptor, it can be registered directly as
`APP_INTERCEPTOR` or applied per-route via `@UseInterceptors()`.

```ts
// foo-context.overlay.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ContextOverlayInterceptor,
  getAppContext,
} from '@concepta/nestjs-common';
import { FooContextInterface } from './foo-context.interface';
import { FooCtx } from './foo-context.overlay';

@Injectable()
export class FooContextOverlay extends ContextOverlayInterceptor {
  readonly ref = FooCtx;

  constructor(private readonly reflector: Reflector) {
    super();
  }

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);
    const resolved = this.resolve(context);
    ctx.defineOverlay(FooCtx, resolved);
  }

  private resolve(context: ExecutionContext): FooContextInterface {
    const meta = this.reflector.getAllAndOverride<{ name: string }>(
      'FOO_NAMESPACE',
      [context.getHandler(), context.getClass()],
    );
    return { namespace: meta?.name ?? 'default' };
  }
}
```

#### Step 3: Register as a global interceptor

Since the overlay extends `ContextOverlayInterceptor` (which implements
`NestInterceptor`), register it directly as `APP_INTERCEPTOR`:

```ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FooContextOverlay } from './foo-context.overlay';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: FooContextOverlay },
  ],
})
export class FooModule {}
```

For per-route overlays, use `@UseInterceptors()`:

```ts
import { UseInterceptors } from '@nestjs/common';
import { FooContextOverlay } from './foo-context.overlay';

@Controller('foo')
@UseInterceptors(FooContextOverlay)
export class FooController { ... }
```

#### Step 4: Consume in a handler

The `@Ctx()` decorator extracts the per-request `AppContextHost` from the
HTTP request. Pass an `OverlayRef` to unwrap the overlay directly.

```ts
import { Controller, Get } from '@nestjs/common';
import { Ctx } from '@concepta/nestjs-common';
import { FooCtx } from './foo-context.overlay';
import { FooContextInterface } from './foo-context.interface';

@Controller('foo')
export class FooController {
  @Get()
  handle(@Ctx(FooCtx) ctx: FooContextInterface) {
    // ctx is the resolved overlay props -- use directly
    const { namespace } = ctx;
  }
}
```

When you need the full `AppContextHost` (e.g. to check multiple overlays),
omit the ref:

```ts
import { Ctx, AppContextHost } from '@concepta/nestjs-common';

@Get()
handle(@Ctx() ctx: AppContextHost) {
  // direct lookup by ref (throws if not defined)
  const { namespace } = ctx.with(FooCtx);

  // optional (returns ctx unchanged if not defined)
  const { namespace } = ctx.optional().withFoo();
}
```

#### Step 5: Testing with defineOverlay()

Use `defineOverlay(ref, values)` to set overlay values directly in tests,
bypassing the full `ContextOverlayInterface` and interceptor pipeline.

```ts
import { AppContextHost } from '@concepta/nestjs-common';
import { FooCtx } from './foo-context.overlay';

const ctx = new AppContextHost();
ctx.defineOverlay(FooCtx, { namespace: 'test-ns' });

expect(ctx.with(FooCtx).namespace).toBe('test-ns');
expect(ctx.supports(FooCtx)).toBe(true);
```

### AppContextHost API

| Method | Description |
| --- | --- |
| `defineOverlay(ref, values)` | Register an overlay by `OverlayRef` and pre-resolved values. Installs a `with*()` method. Idempotent -- subsequent calls with the same name are no-ops. |
| `require(...refs)` | Type-level narrowing. Returns `this` cast to include the typed `with*()` methods for the given refs. No runtime validation. |
| `with(ref)` | Direct lookup by ref. Returns the resolved overlay props, or throws `OverlayNotDefinedException`. |
| `supports(ref)` | Returns `true` if the overlay is defined on this context. |
| `optional()` | Returns a proxy where any `with*()` call returns the resolved overlay if defined, or `this` unchanged if not. |
| `static from(value?)` | Normalizes an `AppContextLike` value to a guaranteed `AppContextHost`. Passes through existing instances; creates a new one for `undefined`, `null`, or `{}`. |

### Proxy Guard

`AppContextHost` wraps itself in a `Proxy` at construction time. Any
property access starting with `with` that is not defined throws
`OverlayNotDefinedException`, immediately surfacing misconfigured pipelines
rather than returning `undefined`.

### Supporting Utilities

| Export | Description |
| --- | --- |
| `getAppContext(request)` | Get or create the `AppContextHost` stored on a request object (keyed by a private `Symbol`). |
| `@Ctx(ref?)` | Parameter decorator. Without a ref, returns the `AppContextHost`. With an `OverlayRef`, calls `appCtx.with(ref)` and returns the unwrapped overlay props. |
| `ContextOverlayInterceptor` | Abstract base class for overlays. Subclass with `ref` and `attach()` to create a self-intercepting overlay. |
| `OverlayRef` | Typed token class carrying the overlay name and resolved props type. |
| `AppContextInterface` | Interface matching the full `AppContextHost` public API. |
| `AppContextLike` | Union type: `AppContextInterface \| PlainLiteralObject \| null \| undefined`. |
| `RefsToMethods<R>` | Mapped type that converts `OverlayRef` tokens to their `with*()` method signatures. |

## Event Context

`EventContextHost` is an immutable container for event headers and metadata,
used when domain aggregates apply events.

```ts
import { EventContextHost } from '@concepta/nestjs-common';

const eventContext = new EventContextHost(
  { entityId: '123', operation: 'create' }, // headers
  { source: 'api' },                        // metadata
);

eventContext.getHeader('entityId'); // '123'
eventContext.getMeta('source');     // 'api'
```

| Export | Description |
| --- | --- |
| `EventContextHost<H, M>` | Immutable (frozen) event context. Constructor spreads and freezes headers/metadata. |
| `EventContextInterface<H, M>` | Interface with `headers`, `metadata`, `getHeader(key)`, and `getMeta(key)`. |

## Exceptions

### RuntimeException

Base exception class for all Rockets modules. Extends `Error` with
structured error codes, HTTP status hints, and user-safe messages.

```ts
import { HttpStatus } from '@nestjs/common';
import { RuntimeException } from '@concepta/nestjs-common';

throw new RuntimeException({
  message: 'Internal: record %s not found',
  messageParams: ['abc-123'],
  safeMessage: 'The requested resource was not found',
  httpStatus: HttpStatus.NOT_FOUND,
});
```

| Property | Default | Description |
| --- | --- | --- |
| `errorCode` | `'RUNTIME_EXCEPTION'` | Machine-readable error code. Subclasses override this. |
| `httpStatus` | `500` | HTTP status hint for the exception filter. |
| `message` | `'Runtime Exception'` | Internal message (may contain sensitive details). Supports `util.format` via `messageParams`. |
| `safeMessage` | -- | User-facing message. Returned by the filter for 4xx errors and as a fallback for 5xx. |
| `context.originalError` | -- | Wrapped original error, if any. |

### ExceptionsFilter

A global `@Catch()` filter that normalizes all exceptions into a consistent
JSON response:

```json
{
  "statusCode": 404,
  "errorCode": "MODEL_QUERY_ERROR",
  "message": "The requested resource was not found",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

Behavior:

- **HttpException** -- uses NestJS status and message
- **RuntimeException** -- uses `errorCode` and `httpStatus`; for 5xx errors,
  hides the internal `message` and returns `safeMessage` or a generic fallback
- **All other exceptions** -- 500 with a generic fallback message

### Exception Exports

| Export | Description |
| --- | --- |
| `RuntimeException` | Base exception with error codes and safe messages |
| `RuntimeExceptionOptions` | Constructor options interface |
| `RuntimeExceptionInterface` | Interface: `httpStatus`, `safeMessage`, `context` |
| `RuntimeExceptionContext` | Type for the `context` property |
| `ExceptionInterface` | Minimal interface: `Error` + `errorCode` + `context` |
| `ExceptionsFilter` | Global catch-all filter |
| `NotAnErrorException` | Wraps non-Error throws |
| `mapNonErrorToException(error)` | Returns `error` if `Error`, else wraps in `NotAnErrorException` |
| `mapHttpStatus(statusCode)` | Maps an HTTP status code to a string error code |

## Utilities

| Export | Description |
| --- | --- |
| `toMilliseconds(value, fallback?)` | Converts time strings (`'1h'`, `'30m'`) to milliseconds via the `ms` library. Throws `RuntimeException` if unparseable. |
| `mapHttpStatus(statusCode)` | Maps an HTTP status code to a string error code (e.g. `404` -> `'NOT_FOUND'`). |
| `mapNonErrorToException(error)` | Wraps non-`Error` values in `NotAnErrorException`. Returns `Error` instances as-is. |
| `DeepPartial<T>` | Recursive `Partial` utility type. |
| `LiteralObject` | Alias for `Record<string, any>`. |

## Module Configuration

Rockets modules share a common settings/options pattern:

| Export | Description |
| --- | --- |
| `createSettingsProvider(options)` | Factory that creates a NestJS provider for module settings. Injects default settings and module options, applies `settings` overrides, and runs `settingsTransform` if provided. |
| `ModuleOptionsSettingsInterface<T>` | Interface for module options with optional `settings` override and `settingsTransform` function. |
| `ModuleOptionsControllerInterface` | Interface with `controller?: false \| Type \| Type[]` for enabling or disabling default module controllers. |

```ts
import { createSettingsProvider } from '@concepta/nestjs-common';

createSettingsProvider<MySettings, MyOptions>({
  settingsToken: MY_SETTINGS_TOKEN,
  optionsToken: RAW_OPTIONS_TOKEN,
  settingsKey: myDefaultConfig.KEY,
});
```

## DTOs

| DTO | Extends | Adds |
| --- | --- | --- |
| `AuditDto` | -- | `dateCreated`, `dateUpdated`, `dateDeleted` |
| `CommonEntityDto` | `AuditDto` | `id` |
| `DomainAggregateDto` | `AuditDto` | `id`, `version` |
| `ReferenceIdDto` | -- | `id` |

`DomainAggregateDto` is the standard base for API response DTOs when using
domain aggregates.

## Model Exceptions and Interfaces

### Model Exceptions

| Exception | Error Code | Description |
| --- | --- | --- |
| `ModelQueryException` | `MODEL_QUERY_ERROR` | Error querying a model |
| `ModelMutateException` | `MODEL_MUTATE_ERROR` | Error mutating a model |
| `ModelValidationException` | `MODEL_VALIDATION_ERROR` | Model validation failure |
| `ModelIdNoMatchException` | `MODEL_ID_NO_MATCH_ERROR` | ID mismatch on update/replace |

### Query Interfaces

| Interface | Method |
| --- | --- |
| `ByIdInterface` | `byId(id)` |
| `ByEmailInterface` | `byEmail(email)` |
| `BySubjectInterface` | `bySubject(subject)` |
| `ByUsernameInterface` | `byUsername(username)` |

### Mutation Interfaces

| Interface | Method |
| --- | --- |
| `CreateOneInterface` | `createOne(...)` |
| `UpdateOneInterface` | `updateOne(...)` |
| `ReplaceOneInterface` | `replaceOne(...)` |
| `RemoveOneInterface` | `removeOne(...)` |

## Domain Interfaces

The module exports shared domain interfaces that are used across multiple
modules or that remain here to avoid circular dependencies.

| Domain | Key Interfaces |
| --- | --- |
| Auth | `AuthenticatedUserInterface`, `AuthenticationAccessInterface`, `AuthenticationLoginInterface`, `AuthenticationRefreshInterface`, `AuthenticationResponseInterface`, `AuthenticationCodeInterface`, `AuthorizationPayloadInterface` |
| Password | `PasswordStorageInterface`, `PasswordPlainInterface`, `PasswordPlainCurrentInterface`, `PasswordUpdateInterface`, `isPasswordStorage` |
| Org | `OrgInterface`, `OrgCreatableInterface`, `OrgUpdatableInterface`, `OrgReplaceableInterface`, `OrgEntityInterface`, `OrgOwnableInterface`, `OrgMemberInterface`, `OrgOwnerInterface`, `OrgMemberEntityInterface` |
| Org Profile | `OrgProfileInterface`, `OrgProfileCreatableInterface`, `OrgProfileEntityInterface` |
| File | `FileInterface`, `FileCreatableInterface`, `FileUpdatableInterface`, `FileOwnableInterface`, `FileEntityInterface` |
| Report | `ReportInterface`, `ReportCreatableInterface`, `ReportUpdatableInterface`, `ReportEntityInterface`, `ReportStatusEnum` |
| Email | `EmailSendInterface`, `EmailSendOptionsInterface` |
| Assignee | `AssigneeRelationInterface` |
