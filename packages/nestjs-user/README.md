# @concepta/nestjs-user

User management module for NestJS using DDD/CQRS. Provides user CRUD
and credential management with password policies (reuse prevention, current
password validation).

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-user)](https://www.npmjs.com/package/@concepta/nestjs-user)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-user)](https://www.npmjs.com/package/@concepta/nestjs-user)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-user%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [Domain Aggregates](#domain-aggregates)
- [Commands](#commands)
- [Queries](#queries)
- [Domain Events](#domain-events)
- [Password Management](#password-management)
- [CRUD Gateway (Optional)](#crud-gateway-optional)
- [Schemas](#schemas)
- [Exceptions](#exceptions)
- [Environment Variables](#environment-variables)
- [Seeding (Optional)](#seeding-optional)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-user @nestjs/common @nestjs/config @nestjs/core
```

This package is ESM-only and requires Node.js >= 22.12 and NestJS 12.

### Dependencies

| Package | Notes |
| --- | --- |
| `@concepta/nestjs-core` | Core interfaces, event context, and utilities |
| `@concepta/nestjs-repository` | Repository abstraction and transaction scope |
| `@concepta/nestjs-password` | Password hashing and validation |
| `zod` | Schema validation and serialization (Standard Schema) |

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS core — install explicitly, no longer bundled |
| `@nestjs/config` | Yes | Module option registration |
| `@nestjs/core` | Yes | Module reference and reflection — install explicitly |
| `@nestjs/cqrs` | No | Optional peer — required in practice for the CQRS buses |
| `typeorm` | No | Only when using TypeORM repository driver |
| `@concepta/nestjs-crud` | Yes | The main entry imports `paginatedSchema` from it |
| `@concepta/typeorm-seeding` | No | Only when using database seeding |
| `@faker-js/faker` | No | Only when using the seed factory |

## Module Registration

### forRoot / forRootAsync

Global registration. Required once per application.

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';
import {
  CreatePasswordCommand,
  PasswordModule,
  ValidateCurrentPasswordCommand,
  ValidatePasswordHistoryCommand,
} from '@concepta/nestjs-password';
import { UserModule } from '@concepta/nestjs-user';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    RepositoryModule.forRoot({}),
    PasswordModule.forRoot({}),

    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: 'user', entity: UserEntity },
        { key: 'user-credentials', entity: UserCredentialEntity },
      ],
    }),

    UserModule.forRoot({
      entities: {
        user: 'user',
        credentials: 'user-credentials',
      },
      ports: {
        password: {
          createCommand: CreatePasswordCommand,
          validateCurrentCommand: ValidateCurrentPasswordCommand,
          validateHistoryCommand: ValidatePasswordHistoryCommand,
        },
      },
      settings: {
        password: {
          reuseAfterDays: 730,
          requireCurrent: true,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### register / registerAsync

Non-global variants of `forRoot`. Identical options, scoped to the importing
module.

### Options

`forRoot()` and `registerAsync()` accept `UserOptionsInterface` merged with
`UserExtrasInterface` (extras are passed to `setExtras` on the
`ConfigurableModuleBuilder`):

```ts
interface UserExtrasInterface {
  global?: boolean;
  providers?: Provider[];
  entities: {
    user: string;              // Entity key for users (required)
    credentials?: string;      // Entity key for credentials (optional)
  };
  repositories?: {
    user?: Type<UserRepositoryInterface>;
    userCredentials?: Type<UserCredentialsRepositoryInterface>;
  };
}

interface UserOptionsInterface {
  settings?: UserSettingsInterface;
  ports?: {
    password?: UserPasswordPortSettings;
  };
}

interface UserSettingsInterface {
  password?: {
    reuseAfterDays?: number;   // Days before password reuse (default: 730)
    requireCurrent?: boolean;  // Require current password on update (default: false)
  };
}

interface UserPasswordPortSettings {
  createCommand: Type<CreatePasswordCommandInterface>;
  validateCurrentCommand: Type<ValidateCurrentPasswordCommandInterface>;
  validateHistoryCommand?: Type<ValidatePasswordHistoryCommandInterface>;
}
```

The `ports.password` commands are dispatched by `UserPasswordPort` (exported
from the main entry along with `CreatePasswordCommandInterface`,
`ValidateCurrentPasswordCommandInterface`, and
`ValidatePasswordHistoryCommandInterface`) to hash and validate passwords.
`@concepta/nestjs-password` ships compatible commands
(`CreatePasswordCommand`, `ValidateCurrentPasswordCommand`,
`ValidatePasswordHistoryCommand`), or you can supply your own implementations
of the command interfaces. When `validateHistoryCommand` is omitted, history
validation always passes.

When `entities.credentials` is omitted, credential-related providers
(`UserCredentialsService`, password policy, credential command handlers)
are not registered. When `entities.credentials` IS configured,
`ports.password` is required — the module throws at bootstrap
(`UserModule: ports.password is required when credentials entity is
configured`) if it is missing.

## Architecture Overview

```text
Gateway (HTTP)
  |
Application (Commands / Queries / Listeners)
  |
Domain (User + UserCredentials aggregates, Events, Services, Policies)
  |
Infrastructure (Repositories, Mappers, Schemas, Config)
```

- **Domain** -- `User` aggregate extending `DomainAggregate<UserInterface>`,
  `UserCredentials` aggregate extending
  `DomainAggregate<UserCredentialInterface>`, domain events,
  `UserCredentialsService`, `UserPasswordPolicy`
- **Application** -- 7 commands and 4 queries dispatched via `@nestjs/cqrs`
- **Infrastructure** -- `UserRepository` and `UserCredentialsRepository` with
  ctx-first signatures, `UserMapper` and `UserCredentialsMapper` for
  entity-to-aggregate conversion (DI-injected), Zod schemas, config
- **Gateway** -- HTTP request handlers bridging `@concepta/nestjs-crud`
  to domain commands (optional)

## Domain Aggregates

### User

Extends `DomainAggregate<UserInterface>`.

| Property | Type |
| --- | --- |
| `id` | `string` |
| `email` | `string` |
| `username` | `string` |
| `active` | `boolean` |
| `version` | `number` |
| `meta` | `AggregateMetaInterface` (dateCreated, dateUpdated, dateDeleted) |

| Method | Description | Event |
| --- | --- | --- |
| `User.create(ctx, props)` | Create with generated UUID | `UserCreatedEvent` |
| `User.createWithId(ctx, id, props)` | Create with explicit ID | `UserCreatedEvent` |
| `update(ctx, dto)` | Partial update (email, active) | `UserUpdatedEvent` |
| `remove(ctx)` | Mark for removal | `UserRemovedEvent` |
| `toPlain()` | Returns `{ id, version, ...props, ...meta }` | -- |

Reconstitution from a database entity is handled by `UserMapper`.

### UserCredentials

Extends `DomainAggregate<UserCredentialInterface>`.

| Property | Type |
| --- | --- |
| `id` | `string` |
| `userId` | `string` |
| `passwordHash` | `string \| null` |
| `passwordSalt` | `string \| null` |
| `active` | `boolean` |
| `validFrom` | `Date` |
| `validTo` | `Date \| null` |
| `version` | `number` |
| `meta` | `AggregateMetaInterface` |

| Method | Description | Event |
| --- | --- | --- |
| `UserCredentials.create(ctx, props)` | Create credentials | `UserCredentialsCreatedEvent` |
| `deactivate(ctx)` | Deactivate and set validTo | `UserCredentialsDeactivatedEvent` |
| `toPlain()` | Returns `{ id, version, ...props, ...meta }` | -- |

Reconstitution from a database entity is handled by `UserCredentialsMapper`.

Credential events exclude `passwordHash` and `passwordSalt` from their
payloads for security.

## Commands

All commands execute within a `TransactionScope`. Domain events are committed
on transaction success and uncommitted on rollback.

### User Commands

| Command | Input | Returns | Description |
| --- | --- | --- | --- |
| `CreateUserCommand` | `ctx, dto` | `User` | Create a new user (auto-creates credentials if password provided) |
| `UpdateUserCommand` | `ctx, id, dto` | `User` | Partial update (email, active) |
| `RemoveUserCommand` | `ctx, id` | `void` | Hard delete |

### Password Commands

| Command | Input | Returns | Description |
| --- | --- | --- | --- |
| `SetUserPasswordCommand` | `ctx, userId, password` | `void` | Set initial password (fails if active credentials exist) |
| `UpdateUserPasswordCommand` | `ctx, userId, passwordDto` | `void` | Update password with policy enforcement |
| `CreateUserCredentialCommand` | `ctx, userId, password` | `UserCredentials` | Create credentials for a user (handled by `CreateUserCredentialHandler`) |
| `UpdateUserCredentialCommand` | `ctx, userId, passwordDto` | `void` | Rotate credentials with policy enforcement (handled by `UpdateUserCredentialHandler`) |

### Dispatching a Command

```ts
import { CommandBus } from '@nestjs/cqrs';
import { CreateUserCommand, User } from '@concepta/nestjs-user';

const user = await this.commandBus.execute<CreateUserCommand, User>(
  new CreateUserCommand(ctx, {
    email: 'alice@example.com',
    username: 'alice',
    active: true,
  }),
);
```

## Queries

| Query | Input | Returns | Description |
| --- | --- | --- | --- |
| `GetUserQuery` | `ctx, id` | `User` | Get by ID |
| `GetUserByEmailQuery` | `ctx, email` | `User \| null` | Find by email |
| `GetUserByUsernameQuery` | `ctx, username` | `User \| null` | Find by username |
| `GetUserBySubjectQuery` | `ctx, subject` | `User \| null` | Find by subject |

## Domain Events

| Event | Payload | Emitted by |
| --- | --- | --- |
| `UserCreatedEvent` | `eventContext, user` | `User.create` |
| `UserUpdatedEvent` | `eventContext, user` | `User.update` |
| `UserRemovedEvent` | `eventContext, user` | `User.remove` |
| `UserCredentialsCreatedEvent` | `eventContext, credentials` (no password fields) | `UserCredentials.create` |
| `UserCredentialsDeactivatedEvent` | `eventContext, credentials` (no password fields) | `UserCredentials.deactivate` |

Events are published after the transaction commits.

## Password Management

### UserCredentialsService

The service orchestrates credential lifecycle within transactions:

- **`setPassword(ctx, userId, password)`** -- Creates initial credentials.
  Fails with `UserCredentialsAlreadyExistException` if active credentials
  exist.
- **`updatePassword(ctx, userId, passwordDto)`** -- Deactivates current
  credentials and creates new ones. Enforces password policy.

### UserPasswordPolicy

Configurable via settings or environment variables:

| Setting | Default | Description |
| --- | --- | --- |
| `reuseAfterDays` | `730` | Days before a password can be reused. `0` disables. |
| `requireCurrent` | `false` | Require current password when updating. |

When `reuseAfterDays > 0`, the service checks credential history within the
lookback window and throws `UserPasswordHistoryViolationException` if the new
password matches a recent one.

When `requireCurrent` is true, the service validates the provided current
password against the active credentials and throws
`UserPasswordCurrentInvalidException` on mismatch.

## CRUD Gateway (Optional)

The module exports request classes and request handlers that bridge HTTP
operations to the CQRS bus. Wire them into a controller via
`CrudModule.forFeature()` from `@concepta/nestjs-crud`.

```ts
import {
  CreateUserRequest,
  CreateUserRequestHandler,
  UpdateUserRequest,
  UpdateUserRequestHandler,
  DeleteUserRequest,
  DeleteUserRequestHandler,
  UpdateUserPasswordRequest,
  UpdateUserPasswordRequestHandler,
  ListUsersRequest,
  ListUsersRequestHandler,
  ReadUserRequest,
  ReadUserRequestHandler,
} from '@concepta/nestjs-user/optional/crud';
```

### Available Request/Handler Pairs

| Operation | Request | Handler |
| --- | --- | --- |
| List | `ListUsersRequest` | `ListUsersRequestHandler` |
| Read | `ReadUserRequest` | `ReadUserRequestHandler` |
| Create | `CreateUserRequest` | `CreateUserRequestHandler` |
| Update | `UpdateUserRequest` | `UpdateUserRequestHandler` |
| Delete | `DeleteUserRequest` | `DeleteUserRequestHandler` |
| Update Password | `UpdateUserPasswordRequest` | `UpdateUserPasswordRequestHandler` |

### Wiring Example

Schemas are passed to `CrudModule.forFeature()` for request validation and
response serialization:

```ts
import { Module } from '@nestjs/common';
import { Operation } from '@concepta/nestjs-core';
import { CrudCqrsResolver, CrudModule } from '@concepta/nestjs-crud';
import {
  UserInterface,
  userCreateSchema,
  userUpdateSchema,
  userPasswordUpdateSchema,
  userSchema,
} from '@concepta/nestjs-user';
import {
  userPaginatedSchema,
  CreateUserRequest,
  CreateUserRequestHandler,
  UpdateUserRequest,
  UpdateUserRequestHandler,
  DeleteUserRequest,
  DeleteUserRequestHandler,
  UpdateUserPasswordRequest,
  UpdateUserPasswordRequestHandler,
  ListUsersRequest,
  ListUsersRequestHandler,
  ReadUserRequest,
  ReadUserRequestHandler,
} from '@concepta/nestjs-user/optional/crud';

@Module({
  imports: [
    // ... CoreModule, CqrsModule, RepositoryModule, PasswordModule,
    //     UserModule, CrudModule.forRoot({ defaultResolver: CrudCqrsResolver })

    CrudModule.forFeature<UserInterface>({
      crud: {
        controller: {
          entity: 'user',
          path: 'user',
          resolver: CrudCqrsResolver,
          transactional: true,
          request: { body: userCreateSchema },
          response: {
            resource: userSchema,
            paginated: userPaginatedSchema,
          },
        },
        operations: [
          {
            operation: Operation.List,
            query: ListUsersRequest,
            queryHandler: ListUsersRequestHandler,
          },
          {
            operation: Operation.Read,
            query: ReadUserRequest,
            queryHandler: ReadUserRequestHandler,
          },
          {
            operation: Operation.Create,
            request: { body: userCreateSchema },
            command: CreateUserRequest,
            commandHandler: CreateUserRequestHandler,
          },
          {
            operation: Operation.Update,
            request: { body: userUpdateSchema },
            command: UpdateUserRequest,
            commandHandler: UpdateUserRequestHandler,
          },
          {
            operation: Operation.Delete,
            command: DeleteUserRequest,
            commandHandler: DeleteUserRequestHandler,
          },
        ],
      },
    }),

    // Password update controller (PATCH /password/:id)
    CrudModule.forFeature({
      crud: {
        controller: {
          entity: 'user',
          path: 'password',
          resolver: CrudCqrsResolver,
          transactional: true,
          request: { body: userPasswordUpdateSchema },
          response: { resource: userSchema },
        },
        operations: [
          {
            operation: Operation.Update,
            request: { body: userPasswordUpdateSchema },
            command: UpdateUserPasswordRequest,
            commandHandler: UpdateUserPasswordRequestHandler,
          },
        ],
      },
    }),
  ],
})
export class AppModule {}
```

Builder-generated controllers derive request body validation from
`operations[].request.body` automatically. If you write a `@CrudController`
class by hand instead, supply the schema either on the operation decorator's
`request.body` or explicitly via `@CrudBody({ schema })` — the validation
pipe resolves the explicit schema first, then the operation's own
`request.body`.

## Schemas

All schemas are Zod v4 objects (Standard Schema compatible), replacing the
legacy class-validator DTO classes.

### Core Schemas

| Schema | Entry | Fields |
| --- | --- | --- |
| `userSchema` | main | `id`, `email`, `username`, `active`, `version`, audit fields (named OpenAPI component `User`) |
| `userCreateSchema` | main | `username`, `email` (validated email), optional `active`, optional `password` (plaintext, min 8 chars) |
| `userUpdateSchema` | main | optional `email` (validated email), optional `active` |
| `userPasswordSchema` | main | `password` (min 8 chars) |
| `userPasswordUpdateSchema` | main | `password` (min 8 chars), optional `passwordCurrent` |
| `userPasswordHashSchema` | main | `passwordHash` (kept for API parity; not wired to any CRUD operation) |
| `userPaginatedSchema` | `optional/crud` | Paginated user list response (named OpenAPI component `UserPaginated`) |
| `userCreateBatchSchema` | `optional/crud` | Batch create request (`bulk` array of `userCreateSchema`) |

Notes:

- `userCreateSchema` accepts a plaintext `password` — `passwordHash` and
  `passwordSalt` are NOT public input anymore. This is a deliberate bug fix:
  the legacy `UserCreateDto` exposed `passwordHash` (never a valid external
  input — hashes are always computed internally via `UserPasswordPort`) and
  silently stripped `password`, so creating a user through the HTTP CRUD
  endpoint never actually set a password. With the schema, `password` works
  end-to-end.
- `userUpdateSchema` has no `id` field — the route param is authoritative
  (the update handler reads `id` from `context.params.id`, never from the
  body).

## Exceptions

| Exception | HTTP Status | Error Code |
| --- | --- | --- |
| `UserException` | -- | `USER_ERROR` |
| `UserNotFoundException` | 404 | `USER_NOT_FOUND_ERROR` |
| `UserCredentialsAlreadyExistException` | 409 | `USER_CREDENTIALS_ALREADY_EXIST` |
| `UserPasswordCurrentInvalidException` | 400 | `USER_PASSWORD_CURRENT_INVALID` |
| `UserPasswordHistoryViolationException` | 400 | `USER_PASSWORD_HISTORY_VIOLATION` |

All exceptions extend `UserException`, which extends `RuntimeException` from
`@concepta/nestjs-core`. `RuntimeException` extends NestJS's `HttpException`,
so no exception filter registration is needed — errors serialize over the
wire as `{ statusCode, message, errorCode, error? }` (no `timestamp`).

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `USER_PASSWORD_REUSE_AFTER_DAYS` | `730` | Days before password reuse allowed |
| `USER_PASSWORD_REQUIRE_CURRENT` | `false` | Require current password on update |

## Seeding (Optional)

When `@concepta/typeorm-seeding` and `@faker-js/faker` are installed, a
`UserFactory` is available for generating seed data.

```ts
import { UserFactory } from '@concepta/nestjs-user/optional/seeding';
```

| Variable | Default | Description |
| --- | --- | --- |
| `USER_MODULE_SEEDER_AMOUNT` | `50` | Number of additional users to create |
| `USER_MODULE_SEEDER_SUPERADMIN_USERNAME` | `superadmin` | Super admin username |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-user` | Module, aggregates, commands, queries, events, handlers, schemas, repositories, ports, exceptions, domain interfaces |
| `@concepta/nestjs-user/optional/crud` | CRUD request/handler classes, `userPaginatedSchema`, `userCreateBatchSchema` |
| `@concepta/nestjs-user/optional/typeorm` | `UserSqliteEntity`, `UserPostgresEntity`, `UserCredentialSqliteEntity`, `UserCredentialPostgresEntity` |
| `@concepta/nestjs-user/optional/seeding` | `UserFactory`, `UserCredentialFactory`, `UserSeeder` |
