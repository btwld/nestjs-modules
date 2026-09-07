# Rockets NestJS Invitation

Invite users by email with OTP-based acceptance, notification dispatch through
consumer-supplied ports, and event-driven lifecycle management.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-invitation)](https://www.npmjs.com/package/@concepta/nestjs-invitation)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-invitation)](https://www.npmjs.com/package/@concepta/nestjs-invitation)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-invitation%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Provided Features](#provided-features)
- [Installation](#installation)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [Aggregate](#aggregate)
- [Ports](#ports)
- [Policies](#policies)
- [Commands](#commands)
- [Queries](#queries)
- [Domain Events](#domain-events)
- [Schemas](#schemas)
- [Exceptions](#exceptions)
- [HTTP Gateway](#http-gateway)
- [Entry Points](#entry-points)
- [Seeding](#seeding)
- [Default Configuration](#default-configuration)

## Provided Features

### Invitation Lifecycle

- Create invitation by user ID (with explicit code)
- Create invitation by email address (auto-generates code, resolves user)
- Send/resend invitation email (with OTP passcode generation)
- Accept invitation (OTP validation + payload for downstream listeners)
- Revoke all invitations for a user+category
- Remove (hard delete) an invitation

### OTP Integration

- Auto-create OTP on invitation send
- Consume OTP on acceptance (single-use)
- Clear all OTPs for a user+category on revocation
- Configurable OTP type (uuid, numeric, etc.)
- Configurable expiration duration
- Optional clear-on-create behavior
- Optional rate limiting (rateSeconds + rateThreshold)

### Notification Dispatch

- The module sends NOTHING itself — listeners dispatch commands through
  `InvitationNotificationPort`, whose command classes are supplied by the
  consumer (see [Ports](#ports))
- Invitation notification command carries the passcode and expiration
- Acceptance confirmation command dispatched on accept
- The consumer's `@CommandHandler`s decide the transport (email, SMS, push)
  and resolve addresses/templates from their own module settings

### User Resolution

- Look up user by ID
- Look up user by email address

### Event-Driven Architecture

- `InvitationCreatedEvent` -- fired on creation
- `InvitationDispatchedEvent` -- fired when email should be sent
  (carries OTP metadata)
- `InvitationAcceptedEvent` -- fired on acceptance
  (carries optional payload for downstream listeners)
- `InvitationRevokedEvent` -- fired on revocation
- `InvitationRemovedEvent` -- fired on deletion
- `InvitationDispatchedListener` dispatches the invitation notification
  command via the notification port
- `InvitationAcceptedListener` dispatches the acceptance confirmation
  command via the notification port
- Auto-clear OTPs on revocation via `InvitationRevokedListener`

### Auto-Revocation

- On acceptance: automatically revoke all sibling invitations (same user+category)
- On revocation: automatically clear associated OTPs

### HTTP Gateway Overview

- Create invitation endpoint (by user ID)
- Create invitation endpoint (by email)
- Send/resend invitation endpoint
- Accept invitation endpoint
- Delete invitation endpoint
- List invitations (paginated)
- Read single invitation

### Repository

- Get invitation by ID
- Find invitation by code
- Find all invitations by user+category
- Save (insert/update)
- Remove single invitation
- Batch remove invitations
- Domain-to-persistence mapping via `InvitationMapper`

### Seeding Overview

- `InvitationFactory` for generating test invitation entities

### Configurable Settings

- OTP: namespace, type, expiration, clear-on-create, rate limiting

---

## Installation

```sh
yarn add @concepta/nestjs-invitation @nestjs/common @nestjs/config @nestjs/core
```

This package is ESM-only and requires Node.js >= 22.12 and NestJS 12.

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@concepta/nestjs-crud` | Yes | The main entry imports `paginatedSchema` from it |
| `@nestjs/common` | Yes | NestJS framework peer |
| `@nestjs/config` | Yes | Used by the module's config factory |
| `@nestjs/core` | Yes | Required transitively by `@nestjs/cqrs` |
| `@nestjs/cqrs` | No | Optional peer — required in practice, the module dispatches all commands/queries through it |
| `rxjs` | Yes | NestJS requirement |
| `typeorm` | No | Only if using the TypeORM repository adapter |
| `@concepta/nestjs-repository-typeorm` | No | Only if using the TypeORM repository adapter |

## Module Registration

### Synchronous

```ts
import { InvitationModule } from '@concepta/nestjs-invitation';

@Module({
  imports: [
    InvitationModule.register({
      settings: {
        otp: {
          namespace: 'user-otp',
          type: 'uuid',
          expiresIn: '24h',
        },
      },
      ports: {
        otp: {
          createCommand: CreateOtpCommand,       // e.g. from @concepta/nestjs-otp
          consumeCommand: ConsumeOtpCommand,
          clearCommand: ClearOtpsCommand,
          validateQuery: ValidateOtpQuery,
        },
        user: {
          getByIdQuery: GetUserQuery,            // e.g. from @concepta/nestjs-user
          getByEmailQuery: GetUserByEmailQuery,
        },
        notification: {
          sendInvitationCommand: MySendInvitationCommand,  // consumer-authored
          sendAcceptedCommand: MySendAcceptedCommand,
        },
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
    InvitationModule.registerAsync({
      useFactory: async () => ({
        settings: { /* ... */ },
        ports: { /* ... */ },
      }),
    }),
  ],
})
export class AppModule {}
```

`register()` / `registerAsync()` register the module **locally** (scoped to
the importing module).

`forRoot()` / `forRootAsync()` register the module **globally**.

### Options

```ts
interface InvitationOptionsInterface extends ModuleOptionsControllerInterface {
  settings?: InvitationSettingsInterface;
  ports: InvitationPortsInterface;
}

interface InvitationPortsInterface {
  otp: InvitationOtpPortSettings;
  user: InvitationUserPortSettings;
  notification: InvitationNotificationPortSettings;
}

interface InvitationSettingsInterface {
  otp: InvitationOtpSettingsInterface;
}
```

## Architecture Overview

The module follows a DDD/CQRS architecture:

```text
Gateways (HTTP request/response handlers)
  |
Application (Commands / Queries / Listeners)
  |
Domain (Invitation aggregate, Events, Ports, Policies)
  |
Infrastructure (Repository, Mapper, Schemas, Config)
```

| Layer | Directory | Responsibility |
| --- | --- | --- |
| Domain | `domain/` | Aggregate, events, ports, policies, repository interface |
| Application | `application/` | Command/query handlers, event listeners, exceptions |
| Infrastructure | `infrastructure/` | Schemas, persistence (repository, mapper, entities), config |
| Gateways | `gateways/` | HTTP request handlers (REST endpoints) |

## Aggregate

The `Invitation` class extends `DomainAggregate<InvitationInterface>` and
encapsulates all invitation domain logic.

### Factory Methods

```ts
// Create with auto-generated UUID
const invitation = Invitation.create(eventContext, {
  code: 'abc-123',
  category: 'onboarding',
  userId: 'user-1',
  constraints: { role: 'editor' },
});

// Create with a specific ID
const invitation = Invitation.createWithId(eventContext, id, dto);
```

### Operations

```ts
// Dispatch invitation (fires InvitationDispatchedEvent)
invitation.dispatch(eventContext);

// Accept invitation (fires InvitationAcceptedEvent)
invitation.accept(eventContext, payload);

// Revoke invitation (fires InvitationRevokedEvent)
invitation.revoke(eventContext);

// Remove invitation (fires InvitationRemovedEvent)
invitation.remove(eventContext);

// Convert to plain object
const plain = invitation.toPlain();
```

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `code` | `string` | Unique invitation code |
| `category` | `string` | Invitation category |
| `userId` | `ReferenceId` | Invited user ID |
| `constraints` | `LiteralObject \| undefined` | Optional constraints |
| `dateAccepted` | `Date \| null` | Acceptance timestamp |
| `dateRevoked` | `Date \| null` | Revocation timestamp |
| `active` | `boolean` | `true` if not accepted and not revoked |
| `isAccepted` | `boolean` | `true` if accepted |
| `isRevoked` | `boolean` | `true` if revoked |

## Ports

External integrations are abstracted via three ports. Each port dispatches
commands/queries through the NestJS CQRS bus.

### InvitationOtpPort

Settings:

```ts
interface InvitationOtpPortSettings {
  createCommand: Type<CreateOtpCommandInterface>;
  consumeCommand: Type<ConsumeOtpCommandInterface>;
  clearCommand: Type<ClearOtpsCommandInterface>;
  validateQuery: Type<ValidateOtpQueryInterface>;
}
```

| Method | Signature | Description |
| --- | --- | --- |
| `create` | `(ctx, category, assigneeId)` | Create OTP with rate limiting support |
| `consume` | `(ctx, category, passcode)` | Validate and consume OTP (single-use) |
| `validate` | `(ctx, category, passcode)` | Validate OTP without consuming |
| `clear` | `(ctx, category, assigneeId)` | Remove all OTPs for user+category |

### InvitationUserPort

Settings:

```ts
interface InvitationUserPortSettings {
  getByIdQuery: Type<GetUserByIdQueryInterface>;
  getByEmailQuery: Type<GetUserByEmailQueryInterface>;
}
```

| Method | Signature | Description |
| --- | --- | --- |
| `getById` | `(ctx, userId)` | Fetch user by ID |
| `getByEmail` | `(ctx, email)` | Fetch user by email |

Returns
`InvitationUserResult = (ReferenceIdInterface & InvitationUserInterface) | null`.

### InvitationNotificationPort

Dispatches notification commands through the CQRS bus. The consumer provides
command classes and registers the matching `@CommandHandler`s — the handler
decides the transport (email, SMS, push, etc.) and resolves any address/template
config from its own module settings.

Settings:

```ts
interface InvitationNotificationPortSettings {
  sendInvitationCommand: Type<SendInvitationNotificationCommandInterface>;
  sendAcceptedCommand: Type<SendAcceptedNotificationCommandInterface>;
}
```

Command interfaces (transport-agnostic — no email fields):

```ts
interface SendInvitationNotificationCommandInterface {
  ctx: PlainLiteralObject;
  invitation: InvitationEventPayloadInterface;
  passcode: string;
  tokenExp: Date;
}

interface SendAcceptedNotificationCommandInterface {
  ctx: PlainLiteralObject;
  invitation: InvitationEventPayloadInterface;
}
```

| Method | Signature | Description |
| --- | --- | --- |
| `sendInvitation` | `(ctx, invitation, { passcode, tokenExp })` | Dispatch invitation notification |
| `sendAccepted` | `(ctx, invitation)` | Dispatch acceptance confirmation notification |

## Policies

### InvitationOtpPolicy

Behavioral configuration for OTP handling.

| Property | Type | Description |
| --- | --- | --- |
| `namespace` | `string` | OTP namespace |
| `type` | `string` | OTP type (uuid, numeric, etc.) |
| `expiresIn` | `string` | Expiration duration |
| `clearOtpOnCreate` | `boolean` | Clear existing OTPs before creating |
| `rateSeconds` | `number` | Rate limit window in seconds |
| `rateThreshold` | `number` | Max creations in rate window |

## Commands

| Command | Handler | Description |
| --- | --- | --- |
| `CreateInvitationCommand` | `CreateInvitationHandler` | Create invitation with user ID + code |
| `CreateInvitationByEmailCommand` | `CreateInvitationByEmailHandler` | Create invitation by email (resolves user, generates code) |
| `SendInvitationCommand` | `SendInvitationHandler` | Resend invitation by ID (generates new OTP) |
| `AcceptInvitationCommand` | `AcceptInvitationHandler` | Validate OTP, accept, revoke siblings |
| `RevokeInvitationsCommand` | `RevokeInvitationsHandler` | Revoke all invitations for user+category |
| `RemoveInvitationCommand` | `RemoveInvitationHandler` | Hard delete an invitation |

### Dispatching a Command

```ts
import { CommandBus } from '@nestjs/cqrs';
import { CreateInvitationCommand, Invitation } from '@concepta/nestjs-invitation';

const invitation = await this.commandBus.execute<CreateInvitationCommand, Invitation>(
  new CreateInvitationCommand(ctx, {
    code: 'abc-123',
    category: 'onboarding',
    userId: 'user-1',
  }),
);
```

## Queries

| Query | Handler | Description |
| --- | --- | --- |
| `GetInvitationQuery` | `GetInvitationHandler` | Fetch invitation by ID |
| `FindInvitationByCodeQuery` | `FindInvitationByCodeHandler` | Fetch invitation by code |

### Dispatching a Query

```ts
import { QueryBus } from '@nestjs/cqrs';
import { GetInvitationQuery, Invitation } from '@concepta/nestjs-invitation';

const invitation = await this.queryBus.execute<GetInvitationQuery, Invitation | null>(
  new GetInvitationQuery(ctx, invitationId),
);
```

## Domain Events

All events carry an `eventContext` and a plain `InvitationEventPayloadInterface`
snapshot.

| Event | Emitted When | Built-in Listener |
| --- | --- | --- |
| `InvitationCreatedEvent` | `Invitation.create()` | -- |
| `InvitationDispatchedEvent` | `Invitation.dispatch()` | `InvitationDispatchedListener` -- dispatches invitation notification command via notification port |
| `InvitationAcceptedEvent` | `Invitation.accept()` | `InvitationAcceptedListener` -- dispatches acceptance notification command via notification port |
| `InvitationRevokedEvent` | `Invitation.revoke()` | `InvitationRevokedListener` -- clears OTPs |
| `InvitationRemovedEvent` | `Invitation.remove()` | -- |

`InvitationDispatchedEvent` carries OTP metadata (`passcode`, `tokenExp`)
via `EventContextHost` meta. The `InvitationDispatchedListener` extracts
this metadata and passes it to the notification port.

### Handling an Event

Listen for invitation events from any module. For example, to activate a user
when their invitation is accepted:

```ts
import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InvitationAcceptedEvent } from '@concepta/nestjs-invitation';

@EventsHandler(InvitationAcceptedEvent)
export class ActivateUserOnInvitationAccepted
  implements IEventHandler<InvitationAcceptedEvent>
{
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: InvitationAcceptedEvent) {
    const { invitation } = event;

    // Only handle invitations in the 'user' category
    if (invitation.category !== 'user') return;

    // Activate the invited user
    await this.commandBus.execute(
      new UpdateUserCommand({}, invitation.userId, { active: true }),
    );
  }
}
```

Register the listener as a provider in your module to start receiving events.

## Schemas

All schemas are Zod v4 objects (Standard Schema compatible), replacing the
legacy class-validator DTO classes.

| Schema | Entry | Fields | Purpose |
| --- | --- | --- | --- |
| `invitationSchema` | main | id, code, category, userId, active, constraints, timestamps | Full invitation representation (response resource) |
| `invitationCreateSchema` | main | category, userId, code, constraints? | Create by user ID |
| `invitationCreateByEmailSchema` | main | email (validated email), category, constraints? | Create by email |
| `invitationAcceptSchema` | main | passcode, payload? | Accept invitation |
| `invitationPaginatedSchema` | `optional/crud` | data: invitationSchema[] + pagination meta | Paginated response wrapper |

## Exceptions

| Exception | HTTP Status | Error Code |
| --- | --- | --- |
| `InvitationException` | -- | `INVITATION_ERROR` |
| `InvitationAlreadyAcceptedException` | 409 | `INVITATION_ALREADY_ACCEPTED_ERROR` |
| `InvitationRevokedException` | 409 | `INVITATION_REVOKED_ERROR` |
| `InvitationNotFoundException` | 404 | `INVITATION_NOT_FOUND_ERROR` |
| `InvitationUserUndefinedException` | -- (400 for a client-supplied email; see source) | `INVITATION_USER_UNDEFINED_ERROR` |
| `InvitationNotAcceptedException` | -- (400 for a wrong/expired passcode; see source) | `INVITATION_NOT_ACCEPTED_ERROR` |

All exceptions extend `InvitationException`, which extends
`RuntimeException` from `@concepta/nestjs-core`. `RuntimeException` extends
NestJS's `HttpException`, so no exception filter registration is needed —
errors serialize over the wire as `{ statusCode, message, errorCode, error? }`
(no `timestamp`).

## HTTP Gateway

The gateway layer bridges `@concepta/nestjs-crud` operations to domain
commands and queries.

### Request Handlers

| Handler | Request Class | Operation |
| --- | --- | --- |
| `CreateInvitationRequestHandler` | `CreateInvitationRequest` | Create by user ID |
| `CreateInvitationByEmailRequestHandler` | `CreateInvitationByEmailRequest` | Create by email |
| `SendInvitationRequestHandler` | `SendInvitationRequest` | Send/resend invitation |
| `AcceptInvitationRequestHandler` | `AcceptInvitationRequest` | Accept with passcode |
| `DeleteInvitationRequestHandler` | `DeleteInvitationRequest` | Hard delete |
| `ListInvitationsRequestHandler` | `ListInvitationsRequest` | Paginated list |
| `ReadInvitationRequestHandler` | `ReadInvitationRequest` | Read single |

### Wiring with CrudModule

```ts
import { Module } from '@nestjs/common';
import { Operation } from '@concepta/nestjs-core';
import { CrudCqrsResolver, CrudModule } from '@concepta/nestjs-crud';
import {
  InvitationInterface,
  InvitationModule,
  invitationSchema,
  invitationCreateSchema,
} from '@concepta/nestjs-invitation';
import {
  invitationPaginatedSchema,
  CreateInvitationRequest,
  CreateInvitationRequestHandler,
  DeleteInvitationRequest,
  DeleteInvitationRequestHandler,
  ListInvitationsRequest,
  ListInvitationsRequestHandler,
  ReadInvitationRequest,
  ReadInvitationRequestHandler,
} from '@concepta/nestjs-invitation/optional/crud';

@Module({
  imports: [
    InvitationModule.forRoot({ /* options */ }),
    CrudModule.forFeature<InvitationInterface>({
      crud: {
        controller: {
          entity: 'invitation',
          path: 'invitation',
          resolver: CrudCqrsResolver,
          transactional: true,
          request: { body: invitationCreateSchema },
          response: {
            resource: invitationSchema,
            paginated: invitationPaginatedSchema,
          },
        },
        operations: [
          {
            operation: Operation.List,
            query: ListInvitationsRequest,
            queryHandler: ListInvitationsRequestHandler,
          },
          {
            operation: Operation.Read,
            query: ReadInvitationRequest,
            queryHandler: ReadInvitationRequestHandler,
          },
          {
            operation: Operation.Create,
            request: { body: invitationCreateSchema },
            command: CreateInvitationRequest,
            commandHandler: CreateInvitationRequestHandler,
          },
          {
            operation: Operation.Delete,
            command: DeleteInvitationRequest,
            commandHandler: DeleteInvitationRequestHandler,
          },
        ],
      },
    }),
  ],
})
export class InvitationFeatureModule {}
```

Builder-generated controllers derive request body validation from
`operations[].request.body` automatically.

### Handwritten Acceptance Controller

Acceptance is exposed through a handwritten `@CrudController` class rather
than a generated one. Handwritten controllers must supply the schema
explicitly for runtime validation — either on the operation decorator's
`request.body` or via `@CrudBody({ schema })`:

```ts
import { CommandBus } from '@nestjs/cqrs';
import { Ctx } from '@concepta/nestjs-core';
import {
  CrudBody,
  CrudContextInterface,
  CrudController,
  CrudCtx,
  CrudUpdate,
} from '@concepta/nestjs-crud';
import {
  InvitationAcceptableInterface,
  invitationAcceptSchema,
} from '@concepta/nestjs-invitation';
import {
  AcceptInvitationRequest,
  AcceptInvitationRequestHandler,
} from '@concepta/nestjs-invitation/optional/crud';

@CrudController({
  path: 'invitation-acceptance',
  entity: 'invitation',
  request: {
    params: {
      code: { field: 'code', type: 'string' },
    },
  },
})
export class InvitationAcceptanceController {
  constructor(private readonly commandBus: CommandBus) {}

  @CrudUpdate({
    path: ':code',
    command: AcceptInvitationRequest,
    commandHandler: AcceptInvitationRequestHandler,
    request: { body: invitationAcceptSchema },
  })
  async acceptInvitation(
    @Ctx(CrudCtx) context: CrudContextInterface<InvitationAcceptableInterface>,
    @CrudBody() dto: InvitationAcceptableInterface,
  ): Promise<void> {
    await this.commandBus.execute(new AcceptInvitationRequest(context, dto));
  }
}
```

Register `AcceptInvitationRequestHandler` as a provider and the controller in
`controllers` of your module.

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-invitation` | Module, aggregate, commands, queries, events, handlers, ports, policies, schemas, repository, mapper, exceptions |
| `@concepta/nestjs-invitation/optional/crud` | Gateway request/handler classes, `invitationPaginatedSchema` |
| `@concepta/nestjs-invitation/optional/typeorm` | `InvitationSqliteEntity`, `InvitationPostgresEntity` |
| `@concepta/nestjs-invitation/optional/seeding` | `InvitationFactory` |

## Seeding

An `InvitationFactory` is available for test seeding:

```ts
import { InvitationFactory } from '@concepta/nestjs-invitation/optional/seeding';
```

It generates random `code` and `category` values using
`crypto.randomUUID()` and `faker.person.jobType()`.

## Default Configuration

| Setting | Default |
| --- | --- |
| `otp.namespace` | `user-otp` |
| `otp.type` | `uuid` |
| `otp.expiresIn` | `7d` |
| `otp.clearOtpOnCreate` | `false` (env: `INVITATION_OTP_CLEAR_ON_CREATE`) |
