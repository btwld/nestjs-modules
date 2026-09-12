# Rockets NestJS Federated Authentication

Authenticate via federated login (OAuth providers like GitHub, Google, Apple).

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-federated)](https://www.npmjs.com/package/@concepta/nestjs-federated)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-federated)](https://www.npmjs.com/package/@concepta/nestjs-federated)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-federated%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

1. [Tutorials](#tutorials)
   - [Introduction](#introduction)
   - [Getting Started](#getting-started)
     - [Step 1: Create the Identity Entity](#step-1-create-the-identity-entity)
     - [Step 2: Configure the User Port](#step-2-configure-the-user-port)
     - [Step 3: Configure the Module](#step-3-configure-the-module)
     - [Step 4: Integrate with an OAuth Module](#step-4-integrate-with-an-oauth-module)
2. [How-To Guides](#how-to-guides)
   - [Override the Identity Repository](#override-the-identity-repository)
3. [Reference](#reference)
   - [Module Options](#module-options)
   - [Key Exports](#key-exports)
4. [Explanation](#explanation)
   - [Architecture](#architecture)
   - [The Sign Flow](#the-sign-flow)

## Tutorials

### Introduction

The `@concepta/nestjs-federated` module manages the link between OAuth provider
identities and your application's users. When a user authenticates via an
external provider (GitHub, Google, Apple), this module:

1. Looks up an existing identity record by provider + subject
2. If found, returns the associated user
3. If not found, creates the user and identity record in a single transaction

Before you begin, set up OAuth Apps for your social providers to obtain Client
IDs and Client Secrets. Refer to the provider-specific auth modules:

- [`@concepta/nestjs-auth-github`](https://www.rockets.tools/reference/rockets/nestjs-auth-github/README)
- [`@concepta/nestjs-auth-apple`](https://www.rockets.tools/reference/rockets/nestjs-auth-apple/README)
- [`@concepta/nestjs-auth-google`](https://www.rockets.tools/reference/rockets/nestjs-auth-google/README)

### Getting Started

#### Installation

```sh
yarn add @concepta/nestjs-federated @nestjs/common @nestjs/config @nestjs/core
```

This package is ESM-only and requires Node.js >= 22.12 and NestJS 12.

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS framework peer |
| `@nestjs/config` | Yes | Used by the module's config factory |
| `@nestjs/core` | Yes | Required transitively by `@nestjs/cqrs` |
| `@nestjs/cqrs` | No | Optional peer — required in practice, `FederatedUserPort` dispatches through the `QueryBus`/`CommandBus` |
| `rxjs` | Yes | NestJS requirement |
| `typeorm` | No | Only if using the TypeORM repository adapter |
| `@concepta/nestjs-repository-typeorm` | No | Only if using the TypeORM repository adapter |

For TypeORM entity base classes (optional):

```sh
yarn add @concepta/nestjs-repository-typeorm
```

### Step 1: Create the Identity Entity

Create a concrete entity that extends one of the abstract base classes from the
optional TypeORM subpath:

```ts
import { Entity, ManyToOne, JoinColumn } from 'typeorm';
import { IdentitySqliteEntity } from '@concepta/nestjs-federated/optional/typeorm';
import { UserEntity } from '../user/user.entity';

@Entity()
export class IdentityEntity extends IdentitySqliteEntity {
  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn()
  user: UserEntity;
}
```

The `user` property is declared `abstract` on the base class, so you must
provide it with the appropriate TypeORM relationship decorator.

For PostgreSQL, extend `IdentityPostgresEntity` instead.

### Step 2: Configure the User Port

The module communicates with your user system through a `userPort` — a set of
query/command class references that the module dispatches via the NestJS CQRS
`QueryBus` and `CommandBus`.

You need to provide three class references:

- `getByIdQuery` — a query class with `(ctx, id)` constructor
- `getByEmailQuery` — a query class with `(ctx, email)` constructor
- `createCommand` — a command class with `(ctx, dto)` constructor

Each must have a registered handler in your application. For example, if you use
`@concepta/nestjs-user`, its `GetUserQuery`, `GetUserByEmailQuery`, and
`CreateUserCommand` satisfy these contracts.

### Step 3: Configure the Module

```ts
import { Module } from '@nestjs/common';
import { FederatedModule } from '@concepta/nestjs-federated';
import { GetUserQuery } from './user/queries/get-user.query';
import { GetUserByEmailQuery } from './user/queries/get-user-by-email.query';
import { CreateUserCommand } from './user/commands/create-user.command';

@Module({
  imports: [
    FederatedModule.forRoot({
      entities: { identity: 'identity' },
      userPort: {
        getByIdQuery: GetUserQuery,
        getByEmailQuery: GetUserByEmailQuery,
        createCommand: CreateUserCommand,
      },
    }),
  ],
})
export class AppModule {}
```

### Step 4: Integrate with an OAuth Module

To complete the authentication flow, use one of the Rockets auth modules:

- [GitHub Authentication](https://www.rockets.tools/reference/rockets/nestjs-auth-github/README)
- [Apple Authentication](https://www.rockets.tools/reference/rockets/nestjs-auth-apple/README)
- [Google Authentication](https://www.rockets.tools/reference/rockets/nestjs-auth-google/README)

These modules call `FederatedOAuthService.sign()` internally to handle the
identity lookup and user creation.

## How-To Guides

### Override the Identity Repository

To provide a custom repository implementation, pass it via the `repositories`
option:

```ts
FederatedModule.forRoot({
  entities: { identity: 'identity' },
  repositories: {
    identity: CustomIdentityRepository,
  },
  userPort: { ... },
})
```

Your custom repository must implement `IdentityRepositoryInterface`.

## Reference

### Module Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `userPort` | `FederatedUserPortSettings` | Yes | Query/command class references for user lookup and creation |
| `settings` | `FederatedSettingsInterface` | No | Reserved for future settings |

#### Extras (passed alongside options)

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `global` | `boolean` | No | Register as a global module (default: `false`) |
| `entities.identity` | `string` | No | Entity key for identity (default: `'identity'`) |
| `repositories.identity` | `Type<IdentityRepositoryInterface>` | No | Custom repository class |

### Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `FederatedModule` | Module | The NestJS dynamic module |
| `FederatedOAuthService` | Service | Core orchestration service with `sign()` method |
| `Identity` | Aggregate | Domain aggregate for identity records |
| `IdentityCreatedEvent` | Event | Emitted when a new identity is created |
| `FederatedUserPort` | Port | QueryBus/CommandBus-based port for user operations |
| `CreateIdentityCommand` | Command | CQRS command for direct identity creation |
| `FindIdentityByProviderQuery` | Query | CQRS query to find identity by provider + subject |
| `IdentityRepositoryInterface` | Interface | Contract for custom repository implementations |
| `FederatedCredentialsInterface` | Interface | User credentials shape (`id`, `email`, `username`) |
| `identitySchema` | Schema | Zod schema for identity records (serialization) |
| `identityCreateSchema` | Schema | Zod schema for identity creation (validation) |
| `FederatedException` | Exception | Base exception (extends `RuntimeException`, which extends NestJS's `HttpException` — no filter needed; wire body `{ statusCode, message, errorCode, error? }`) |
| `IdentityCreateUserException` | Exception | User creation via the user port failed |
| `IdentityFindUserException` | Exception | User lookup via the user port failed |
| `IdentityUserRelationshipException` | Exception | Identity record has no valid user relationship |

#### Optional TypeORM Exports

Available via `@concepta/nestjs-federated/optional/typeorm`:

| Export | Description |
|--------|-------------|
| `IdentitySqliteEntity` | Abstract base entity for SQLite |
| `IdentityPostgresEntity` | Abstract base entity for PostgreSQL |

## Explanation

### Architecture

The module follows DDD/Clean Architecture:

- **Domain layer**: `Identity` aggregate (write-once), `FederatedOAuthService`
  (orchestration), `FederatedUserPort` (external user system integration),
  repository interface
- **Application layer**: `CreateIdentityCommand` and
  `FindIdentityByProviderQuery` with their handlers
- **Infrastructure layer**: TypeORM entity base classes, repository
  implementation, mapper, Zod schemas, provider factories

### The Sign Flow

`FederatedOAuthService.sign(ctx, provider, email, subject)` orchestrates the
full federated login:

1. **Lookup**: Find an existing identity by `provider` + `subject`
2. **Existing identity found**:
   - Verify the identity has a valid user relationship
   - Look up the user via `FederatedUserPort.getById()`
   - Return the user credentials
3. **No identity found** (wrapped in a transaction):
   - Check if a user with the given email already exists via
     `FederatedUserPort.getByEmail()`
   - If no user exists, create one via `FederatedUserPort.create()`
   - Create an `Identity` aggregate and persist it
   - Emit `IdentityCreatedEvent` on transaction commit
   - Return the user credentials
