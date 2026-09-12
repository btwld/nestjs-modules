# @concepta/nestjs-otp

OTP management module for NestJS using DDD/CQRS. Provides one-time passcode
generation, validation, and consumption with rate limiting, configurable
duplicate strategies, and automatic history cleanup.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-otp)](https://www.npmjs.com/package/@concepta/nestjs-otp)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-otp)](https://www.npmjs.com/package/@concepta/nestjs-otp)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-otp%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [App Context](#app-context)
- [Commands](#commands)
- [Queries](#queries)
- [Domain Events](#domain-events)
- [Otp Aggregate](#otp-aggregate)
- [Otp Policy](#otp-policy)
- [Repository](#repository)
- [Context Overlay](#context-overlay)
- [Schemas](#schemas)
- [Exceptions](#exceptions)
- [HTTP Controller with CRUD Module](#http-controller-with-crud-module)
- [Entry Points](#entry-points)
- [Seeding](#seeding)
- [Environment Variables](#environment-variables)

## Installation

```sh
yarn add @concepta/nestjs-otp @nestjs/common @nestjs/config @nestjs/core
```

This package is ESM-only and requires Node.js >= 22.12 and NestJS 12.

### Dependencies

`@standard-schema/spec` and `zod` are direct dependencies — request/response
shapes are Zod v4 (Standard Schema) schemas.

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS 12 framework |
| `@nestjs/core` | Yes | Module reference and reflection |
| `@nestjs/config` | Yes | Settings/config loading |
| `@nestjs/cqrs` | No | Optional peer — required in practice for `CommandBus`, `QueryBus`, `EventBus` |
| `rxjs` | Yes | Required by NestJS interceptors |
| `typeorm` | No | Only if using the TypeORM repository adapter |
| `@concepta/typeorm-seeding` | No | Only for database seeding |
| `@faker-js/faker` | No | Only for database seeding |

`@concepta/nestjs-crud` is NOT a dependency of this package — it is only
needed if you choose to wire OTP operations into REST endpoints yourself
(see [HTTP Controller with CRUD Module](#http-controller-with-crud-module)).

## Module Registration

### Synchronous

```ts
import { OtpModule } from '@concepta/nestjs-otp';

@Module({
  imports: [
    OtpModule.register({
      settings: {
        types: {
          uuid: { generator: uuidGenerator, validator: uuidValidator },
        },
        duplicateStrategy: 'DEACTIVATE',
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
    OtpModule.registerAsync({
      useFactory: async () => ({
        settings: {
          types: {
            uuid: { generator: uuidGenerator, validator: uuidValidator },
          },
          duplicateStrategy: 'DEACTIVATE',
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

### forFeature

Use `forFeature()` to register dynamic `OtpRepository` providers for each
entity key.

```ts
@Module({
  imports: [
    OtpModule.forFeature(['userOtp', 'emailOtp']),
  ],
})
export class UserModule {}
```

Each entity key maps to an `OtpRepository` instance resolved at runtime by
`OtpRepositoryResolver`.

### Options

`forRoot()` and `registerAsync()` accept `OtpOptionsInterface` merged with
`OtpExtrasInterface` (extras are passed to `setExtras` on the
`ConfigurableModuleBuilder`):

```ts
interface OtpExtrasInterface {
  global?: boolean;
  providers?: Provider[];
  repositories?: {
    otp?: Type<OtpRepositoryInterface>;
  };
}

interface OtpOptionsInterface {
  settings?: OtpSettingsInterface;
}

interface OtpSettingsInterface {
  types: Record<string, OtpTypeServiceInterface>;
  duplicateStrategy: 'ALLOW' | 'DEACTIVATE';
  keepHistoryDays?: number;
  rateSeconds?: number;
  rateThreshold?: number;
}
```

`forFeature()` accepts an array of entity key strings. Each key creates a
dynamic `OtpRepository` provider:

```ts
OtpModule.forFeature(entityKeys: string[])
```

- **`types`** -- map of OTP type strategies. Each type provides a `generator()`
  that returns a new passcode and a `validator(a, b)` that checks equality.
  The default `uuid` type uses `crypto.randomUUID()`.
- **`duplicateStrategy`** -- `'DEACTIVATE'` deactivates existing active OTPs
  for the same assignee and category before creating a new one. `'ALLOW'`
  permits multiple active OTPs simultaneously.
- **`keepHistoryDays`** -- when set, consumed/deactivated OTPs are retained for
  N days then cleaned up automatically. When unset, OTPs are hard-deleted
  immediately.
- **`rateSeconds`** / **`rateThreshold`** -- rate limiting window (in seconds)
  and maximum creation attempts within that window. Exceeding the threshold
  throws `OtpLimitReachedException`.

Pass `repositories.otp` to override the default `OtpRepository` with a
custom implementation.

## Architecture Overview

The module follows a DDD/CQRS architecture:

```text
Application (Commands / Queries / Listeners)
  |
Domain (Otp aggregate, Events, Services)
  |
Infrastructure (Repository, Mapper, Schemas, Config)
```

- **Domain** -- `Otp` aggregate extending `DomainAggregate<OtpInterface>`,
  3 domain events, history cleanup service, domain policy (`OtpPolicy`)
- **Application** -- 6 commands and 4 queries dispatched via `@nestjs/cqrs`,
  1 built-in event listener
- **Infrastructure** -- `OtpRepository` with ctx-first signatures,
  `OtpMapper` for entity-to-aggregate conversion (DI-injected),
  `OtpRepositoryResolver`, Zod schemas, config

The module ships no HTTP controllers or request handlers of its own, but it
DOES export gateway context-overlay helpers (`OtpContextOverlay`, `OtpCtx`,
`OtpNamespace` — see [Context Overlay](#context-overlay)). See
[HTTP Controller with CRUD Module](#http-controller-with-crud-module) for how
to expose OTP operations as REST endpoints.

## App Context

Commands, queries, and repository methods accept a `PlainLiteralObject` as
their `ctx` argument. This context is threaded through the transaction scope
and repository layer automatically. In HTTP contexts the gateway provides
the context; for programmatic use, pass any plain object:

```ts
const otp = await this.commandBus.execute<CreateOtpCommand, Otp>(
  new CreateOtpCommand({}, 'userOtp', dto),
);
```

## Commands

| Command | Description |
| --- | --- |
| `CreateOtpCommand` | Create a new OTP (with rate limiting and duplicate strategy) |
| `ConsumeOtpCommand` | Validate and consume an active OTP by category and passcode |
| `DeactivateOtpCommand` | Deactivate the active OTP for an assignee and category |
| `RemoveOtpCommand` | Hard delete an OTP by assignee, category, and passcode |
| `ClearOtpsCommand` | Remove all OTPs for an assignee and category |
| `ClearOtpHistoryCommand` | Clean up old OTP history by retention days |

### Dispatching a Command

```ts
import { CommandBus } from '@nestjs/cqrs';
import { CreateOtpCommand, Otp } from '@concepta/nestjs-otp';

const otp = await this.commandBus.execute<CreateOtpCommand, Otp>(
  new CreateOtpCommand(ctx, 'userOtp', {
    category: 'email-verification',
    type: 'uuid',
    expiresIn: '15m',
    assigneeId: userId,
  }),
);
```

`CreateOtpCommand` accepts an optional fourth argument for per-request
overrides:

```ts
new CreateOtpCommand(ctx, 'userOtp', dto, {
  duplicateStrategy: 'ALLOW',
  rateSeconds: 60,
  rateThreshold: 3,
});
```

## Queries

| Query | Description |
| --- | --- |
| `GetOtpQuery` | Get by ID (throws `OtpNotFoundException`) |
| `FindActiveOtpQuery` | Find active OTP by category and passcode (returns null) |
| `FindAssignedOtpsQuery` | Find all OTPs for an assignee and category |
| `ValidateOtpQuery` | Validate passcode without consuming (returns assignee or null) |

### Dispatching a Query

```ts
import { QueryBus } from '@nestjs/cqrs';
import { ValidateOtpQuery } from '@concepta/nestjs-otp';
import { AssigneeRelationInterface } from '@concepta/nestjs-core';

const result = await this.queryBus.execute<
  ValidateOtpQuery,
  AssigneeRelationInterface | null
>(
  new ValidateOtpQuery(ctx, 'userOtp', {
    category: 'email-verification',
    passcode,
  }),
);
```

## Domain Events

All events carry an `eventContext` and a plain `OtpInterface` snapshot.

| Event | Emitted When |
| --- | --- |
| `OtpCreatedEvent` | New OTP created |
| `OtpConsumedEvent` | OTP consumed/used |
| `OtpDeactivatedEvent` | OTP deactivated |

### Handling an Event

```ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OtpCreatedEvent } from '@concepta/nestjs-otp';

@EventsHandler(OtpCreatedEvent)
export class OtpCreatedListener implements IEventHandler<OtpCreatedEvent> {
  handle(event: OtpCreatedEvent): void {
    const { eventContext, otp } = event;
    // react to OTP creation
  }
}
```

`OtpHistoryCleanupListener` is a built-in listener that reacts to
`OtpCreatedEvent` and automatically cleans up old history when
`keepHistoryDays` is configured.

## Otp Aggregate

The `Otp` class extends `DomainAggregate<OtpInterface>` and encapsulates all
OTP domain logic.

### Factory Methods

```ts
// Create with auto-generated UUID
const otp = Otp.create(eventContext, {
  category: 'email-verification',
  type: 'uuid',
  assigneeId: userId,
  passcode,
  expirationDate,
});

// Create with a specific ID
const otp = Otp.createWithId(eventContext, id, props);
```

Reconstitution from a database entity is handled by `OtpMapper` (see
[Repository](#repository)).

### Operations

```ts
// Deactivate the OTP (sets active to false)
otp.deactivate(eventContext);

// Mark OTP as consumed
otp.consume(eventContext);

// Check if the OTP has expired
otp.isExpired();

// Convert to plain OtpInterface object (inherited from DomainAggregate)
const plain = otp.toPlain();
```

## Otp Policy

`OtpPolicy` (exported with its `OtpPolicySettings` interface) fronts access
to OTP settings — type-service resolution, duplicate strategy, history
retention, and rate limiting. It is constructed from the module settings and
provided in DI, and exported from the core module so consumers can inject it
directly instead of the raw settings token.

```ts
interface OtpPolicySettings {
  types?: { [key: string]: OtpTypeServiceInterface };
  duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
  keepHistoryDays?: number;
  rateSeconds?: number;
  rateThreshold?: number;
}

class OtpPolicy {
  constructor(settings?: OtpPolicySettings);
  resolveTypeService(type: string): OtpTypeServiceInterface;
  resolveDuplicateStrategy(override?: 'ALLOW' | 'DEACTIVATE'): 'ALLOW' | 'DEACTIVATE';
  resolveKeepHistoryDays(override?: number): number | undefined;
  resolveRateLimit(overrides?: {
    rateSeconds?: number;
    rateThreshold?: number;
  }): { rateSeconds: number; rateThreshold: number } | undefined;
}
```

`resolveTypeService(type)` throws `OtpTypeNotDefinedException` when no
type service is registered for `type`. Every `resolve*` method accepts a
per-call override that takes precedence over the module-level setting — this
is how command/query handlers apply request-level rate-limit or
duplicate-strategy overrides without bypassing the module default. All five
command/query handlers and the history-cleanup listener resolve settings
through `OtpPolicy` rather than reading the settings token directly.

## Repository

`OtpRepository` uses a ctx-first calling convention. All methods take
`PlainLiteralObject` as the first argument.

The repository receives a DI-injected `OtpMapper` that converts database
entities to `Otp` aggregates via `toDomain()` and aggregates back to
persistence form via `toPersistence()`.

| Method | Signature |
| --- | --- |
| `get` | `(ctx, id) => Promise<Otp>` |
| `findActiveByPasscode` | `(ctx, { category, passcode }) => Promise<Otp \| null>` |
| `findByPasscode` | `(ctx, { category, passcode }) => Promise<Otp \| null>` |
| `findActiveByAssignee` | `(ctx, { assigneeId, category }) => Promise<Otp \| null>` |
| `findAllByAssigneeAndCategory` | `(ctx, { assigneeId, category }) => Promise<Otp[]>` |
| `countCreatedSince` | `(ctx, { assigneeId, category, since }) => Promise<number>` |
| `findOlderThan` | `(ctx, { assigneeId, category, cutoff }) => Promise<Otp[]>` |
| `save` | `(ctx, otp) => Promise<void>` |
| `remove` | `(ctx, otp) => Promise<void>` |
| `removeAll` | `(ctx, otps) => Promise<void>` |

### Repository Resolution

```ts
const otpRepo = this.repositoryResolver.resolve('userOtp');
const otp = await otpRepo.get(ctx, id);
```

`OtpRepositoryResolver` looks up the repository by entity key. Entity keys
are registered via `OtpModule.forFeature()`.

## Context Overlay

While the module ships no HTTP controllers, it exports a context overlay for
resolving the OTP entity namespace per HTTP request when you build your own
gateway:

- **`OtpNamespace`** -- decorator: apply `@OtpNamespace({ name })` to a
  controller (or pass via `extraDecorators` on a generated CRUD controller)
  to associate it with an OTP entity key
- **`OtpContextOverlay`** -- extends `ContextOverlayInterceptor`; register it
  as a global `APP_INTERCEPTOR`. Its `attach()` reads the `@OtpNamespace`
  metadata via `Reflector` and calls `ctx.defineOverlay(OtpCtx, { namespace })`
- **`OtpCtx`** -- the `OverlayRef`; request handlers read the namespace via
  `@Ctx(OtpCtx)` (or `ctx.with(OtpCtx)`) and pass it to commands/queries

## Schemas

Schemas are Zod v4 objects (Standard Schema compatible), replacing the legacy
class-validator DTO classes.

| Schema | Fields |
| --- | --- |
| `otpCreateSchema` | `category`, `type`, `expiresIn`, `rateSeconds?` (int >= 0), `rateThreshold?` (int >= 1), `assigneeId` |

The `expiresIn` field accepts time span strings: `'60'`, `'2 days'`, `'10h'`,
`'7d'`.

`otpCreateSchema` is programmatic-only: it carries no OpenAPI wrapper
(`withOpenApi`/`withNamedComponent`) because the module has no HTTP surface
of its own. `CreateOtpHandler` validates every incoming dto against it and
throws `OtpValidationException` when validation fails.

## Exceptions

| Exception | Description |
| --- | --- |
| `OtpNotFoundException` | OTP ID not found (HTTP 404) |
| `OtpEntityNotFoundException` | Entity key not registered via `forFeature()` |
| `OtpTypeNotDefinedException` | OTP type not configured in settings |
| `OtpLimitReachedException` | Rate limit exceeded (HTTP 429) |
| `OtpInvalidExpirationDateException` | Invalid `expiresIn` format |
| `OtpValidationException` | Schema validation failed (HTTP 400, error code `OTP_VALIDATION_ERROR`, context `{ schemaName, validationErrors }`) |
| `OtpException` | Base OTP exception |

All exceptions extend `OtpException`, which extends `RuntimeException` from
`@concepta/nestjs-core`. `RuntimeException` extends NestJS's
`HttpException`, so no exception filter registration is needed — errors
serialize over the wire as `{ statusCode, message, errorCode, error? }`
(no `timestamp`).

## HTTP Controller with CRUD Module

The OTP module ships no controllers or request handlers of its own. To expose
OTP operations as REST endpoints via `@concepta/nestjs-crud`, create custom
request and handler classes that bridge CRUD operations to domain commands.

### Custom Request Class

Extend a CRUD command to define the request type:

```ts
import { CrudCreateCommand } from '@concepta/nestjs-crud';
import { OtpCreatableInterface, OtpInterface } from '@concepta/nestjs-otp';

export class CreateOtpRequest extends CrudCreateCommand<
  OtpInterface,
  OtpCreatableInterface
> {}
```

### Custom Request Handler

The handler receives the CRUD command and dispatches the domain command:

```ts
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CrudCreateCommand } from '@concepta/nestjs-crud';
import { CreateOtpCommand, Otp, OtpCreatableInterface, OtpInterface } from '@concepta/nestjs-otp';

@Injectable()
export class CreateOtpRequestHandler {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(
    command: CrudCreateCommand<OtpInterface, OtpCreatableInterface>,
  ): Promise<OtpInterface> {
    const { context, dto } = command;
    const otp = await this.commandBus.execute<CreateOtpCommand, Otp>(
      new CreateOtpCommand(context, 'userOtp', dto),
    );
    return otp.toPlain();
  }
}
```

(To avoid hard-coding the namespace, register `OtpContextOverlay` and read it
from the context via `OtpCtx` — see [Context Overlay](#context-overlay).)

### Response Schema

`otpCreateSchema` is a request schema — do not reuse it as a response
resource. Author a small response schema yourself with the OpenAPI helpers
from `@concepta/nestjs-core`:

```ts
import { z } from 'zod';
import { withNamedComponent } from '@concepta/nestjs-core';

// Deliberately omits `passcode` so it is never serialized to clients.
export const otpResponseSchema = withNamedComponent(
  z.object({
    assigneeId: z.string(),
    category: z.string(),
    type: z.string(),
    expirationDate: z.date(),
    active: z.boolean(),
  }),
  'Otp',
);
```

### Module Wiring

```ts
import { Module } from '@nestjs/common';
import { Operation } from '@concepta/nestjs-core';
import { CrudCqrsResolver, CrudModule } from '@concepta/nestjs-crud';
import { OtpInterface, OtpModule, otpCreateSchema } from '@concepta/nestjs-otp';

import { CreateOtpRequest } from './create-otp.request';
import { CreateOtpRequestHandler } from './create-otp-request.handler';
import { otpResponseSchema } from './otp-response.schema';

@Module({
  imports: [
    OtpModule.forFeature(['userOtp']),
    CrudModule.forFeature<OtpInterface>({
      crud: {
        controller: {
          entity: 'userOtp',
          path: 'otp/user',
          resolver: CrudCqrsResolver,
          transactional: true,
          request: { body: otpCreateSchema },
          response: { resource: otpResponseSchema },
        },
        operations: [
          {
            operation: Operation.Create,
            request: { body: otpCreateSchema },
            command: CreateOtpRequest,
            commandHandler: CreateOtpRequestHandler,
          },
        ],
      },
    }),
  ],
})
export class UserOtpModule {}
```

Builder-generated controllers derive request body validation from
`operations[].request.body` automatically; a handwritten `@CrudController`
class would need an explicit `@CrudBody({ schema })` for runtime validation.
Note that `otpCreateSchema` has no OpenAPI wrapper (it is programmatic-only),
so wrap it with `withOpenApi` from `@concepta/nestjs-core` if you want the
request body documented in generated Swagger output.

This is a minimal example showing a single Create operation. Add more
operations (Read, List, Delete, etc.) by creating additional request/handler
pairs following the same pattern. See the `@concepta/nestjs-crud` documentation
for the full API.

`OtpModule.forRoot()` (or `forRootAsync()`) must be registered globally
in a parent module for `forFeature()` to resolve its dependencies.

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-otp` | Module, aggregate, commands, queries, events, handlers, `OtpPolicy` / `OtpPolicySettings`, `otpCreateSchema`, repository, context overlay (`OtpContextOverlay`, `OtpCtx`, `OtpNamespace`), exceptions, domain interfaces |
| `@concepta/nestjs-otp/optional/typeorm` | `OtpSqliteEntity`, `OtpPostgresEntity` |
| `@concepta/nestjs-otp/optional/seeding` | `OtpFactory` |

## Seeding

An `OtpFactory` is available for test seeding:

```ts
import { OtpFactory } from '@concepta/nestjs-otp/optional/seeding';
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `OTP_DUPLICATE_STRATEGY` | `DEACTIVATE` | `'DEACTIVATE'` or `'ALLOW'` |
| `OTP_KEEP_HISTORY_DAYS` | `null` | Days to retain OTP history |
| `OTP_RATE_SECONDS` | `null` | Rate limit window in seconds |
| `OTP_RATE_THRESHOLD` | `null` | Max creation attempts in rate window |
