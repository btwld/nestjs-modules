# @concepta/nestjs-role

Role-based access management module for NestJS. Manages roles and role
assignments through a DDD/CQRS architecture with domain aggregates, commands,
queries, and domain events.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-role)](https://www.npmjs.com/package/@concepta/nestjs-role)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-role)](https://www.npmjs.com/package/@concepta/nestjs-role)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-role%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [Domain Aggregates](#domain-aggregates)
- [Commands](#commands)
- [Queries](#queries)
- [Domain Events](#domain-events)
- [CRUD Gateway (Optional)](#crud-gateway-optional)
- [Schemas](#schemas)
- [Exceptions](#exceptions)
- [Seeding (Optional)](#seeding-optional)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-role @nestjs/common @nestjs/core
```

This package is ESM-only and requires Node.js >= 22.12 and NestJS 12.

### Dependencies

| Package | Notes |
| --- | --- |
| `@concepta/nestjs-core` | Core interfaces, event context, and utilities |
| `@concepta/nestjs-repository` | Repository abstraction and transaction scope |
| `zod` | Schema validation and serialization (Standard Schema) |

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS core — install explicitly, no longer bundled |
| `@nestjs/core` | Yes | Module reference and reflection — install explicitly |
| `@nestjs/cqrs` | No | Optional peer — required in practice for the CQRS buses |
| `typeorm` | No | Only when using TypeORM repository driver |
| `@concepta/nestjs-crud` | Yes | The main entry imports `paginatedSchema` from it |
| `@concepta/typeorm-seeding` | No | Only when using database seeding |
| `@faker-js/faker` | No | Only when using the seed factory |

## Quick Start

Register the module, define your entities, and wire up repositories.

### Entities

Define TypeORM entities that implement the domain interfaces:

```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { RoleEntityInterface, RoleAssignmentEntityInterface } from '@concepta/nestjs-role';

@Entity()
export class RoleEntity implements RoleEntityInterface {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column() description!: string;
  @Column() dateCreated!: Date;
  @Column() dateUpdated!: Date;
  @Column({ nullable: true }) dateDeleted!: Date | null;
  @Column({ default: 1 }) version!: number;
}

@Entity()
export class UserRoleEntity implements RoleAssignmentEntityInterface {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() roleId!: string;
  @Column() assigneeId!: string;
  @Column() dateCreated!: Date;
  @Column() dateUpdated!: Date;
  @Column({ nullable: true }) dateDeleted!: Date | null;
  @Column({ default: 1 }) version!: number;
}
```

### App Module

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';
import { RoleModule } from '@concepta/nestjs-role';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    RepositoryModule.forRoot({}),

    // Register the repository entities
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: 'role', entity: RoleEntity },
        { key: 'user-role', entity: UserRoleEntity },
      ],
    }),

    // Register the role module globally
    RoleModule.forRoot({}),

    // Register repository providers for your entity keys
    RoleModule.forFeature({
      roleEntityKey: 'role',
      assignmentEntityKeys: ['user-role'],
    }),
  ],
})
export class AppModule {}
```

### Using Commands and Queries Directly

```ts
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateRoleCommand, GetRoleQuery, AssignRoleCommand } from '@concepta/nestjs-role';

@Injectable()
export class MyService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createRole(ctx, namespace: string, name: string, description: string) {
    return this.commandBus.execute(
      new CreateRoleCommand(ctx, namespace, { name, description }),
    );
  }

  async getRole(ctx, namespace: string, id: string) {
    return this.queryBus.execute(new GetRoleQuery(ctx, namespace, id));
  }

  async assignRole(ctx, namespace: string, roleId: string, assigneeId: string) {
    return this.commandBus.execute(
      new AssignRoleCommand(ctx, namespace, roleId, assigneeId),
    );
  }
}
```

## Module Registration

### forRoot / forRootAsync

Global registration. Required once per application.

```ts
RoleModule.forRoot({})

// Async with factory
RoleModule.forRootAsync({
  useFactory: async () => ({}),
})
```

Entity namespacing is NOT configured here — it is handled per-feature via
`RoleModule.forFeature({ roleEntityKey, assignmentEntityKeys })` plus the
`RoleNamespace` decorator (see [Context Overlay](#context-overlay)).

### register / registerAsync

Non-global variants of `forRoot`. Identical options, scoped to the importing
module.

### forFeature

Per-entity registration. Creates repository providers for your entity keys.
Call once for each set of role/assignment entities you need.

```ts
RoleModule.forFeature({
  roleEntityKey: 'role',
  assignmentEntityKeys: ['user-role', 'org-member-role'],
})
```

### Options

`forRoot()` and `registerAsync()` accept `RoleOptionsInterface` merged with
`RoleExtrasInterface` (extras are passed to `setExtras` on the
`ConfigurableModuleBuilder`):

```ts
interface RoleExtrasInterface {
  global?: boolean;
  providers?: Provider[];
  repositories?: {
    role?: Type<RoleRepositoryInterface>;
    roleAssignment?: Type<RoleAssignmentRepositoryInterface>;
  };
}

interface RoleOptionsInterface {}
```

`RoleOptionsInterface` is currently empty — entity keys are supplied
through `RoleModule.forFeature()` and resolved per-request via the
`RoleNamespace` decorator and context overlay (see
[Context Overlay](#context-overlay)).

`forFeature()` accepts entity key configuration for repository provider
creation:

```ts
RoleModule.forFeature(config: {
  roleEntityKey: string;
  assignmentEntityKeys: string[];
})
```

Pass `repositories.role` or `repositories.roleAssignment` to override the
default repository implementations.

## Architecture Overview

```text
                    ┌───────────────────────────────┐
                    │   CRUD HTTP Gateway           │
                    │   (optional: nestjs-crud)     │
                    │                               │
                    │  Request → RequestHandler     │
                    └──────────────┬────────────────┘
                                   │
                          CommandBus / QueryBus
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐   ┌─────────────────┐   ┌─────────────────────┐
│ Command Handlers │   │ Query Handlers  │   │ Domain Events       │
│                  │   │                 │   │                     │
│ Create, Update,  │   │ Get, List,      │   │ RoleCreatedEvent    │
│ Replace, Remove, │   │ IsAssigned      │   │ RoleUpdatedEvent    │
│ Assign, Revoke   │   │                 │   │ RoleReplacedEvent   │
└────────┬─────────┘   └────────┬────────┘   │ RoleAssignedEvent   │
         │                      │            │ RoleRevokedEvent    │
         ▼                      ▼            └─────────────────────┘
┌──────────────────────────────────────────┐
│ Domain Aggregates                        │
│                                          │
│ Role (DomainAggregate<RoleInterface>)    │
│ RoleAssignment (DomainAggregate<...>)    │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│ Repositories + Mappers                   │
│                                          │
│ RoleRepository ← RoleMapper (DI)         │
│ RoleAssignmentRepository ← Mapper (DI)   │
│                                          │
│ Resolved via RepositoryResolver          │
│ (multi-entity / multi-tenant support)    │
└────────────────────┬─────────────────────┘
                     │
                     ▼
              Database Driver
```

**Layers:**

- **Gateway** — Adapts HTTP requests to CQRS commands/queries. Optional;
  requires `@concepta/nestjs-crud`.
- **Application** — Command and query handlers. Orchestrates transactions,
  event publishing, and repository calls.
- **Domain** — Aggregate roots (`Role`, `RoleAssignment`) encapsulate business
  rules and emit domain events.
- **Infrastructure** — Repositories with DI-injected mappers (`RoleMapper`,
  `RoleAssignmentMapper`), Zod schemas, configuration, and provider
  factories.

## Context Overlay

The role module uses a context overlay to resolve the entity namespace for
each HTTP request. This is required when using the CRUD gateway.

### RoleNamespace Decorator

Apply `@RoleNamespace({ name })` to a controller (or via `extraDecorators`
on a generated CRUD controller) to associate it with a role or assignment
entity key:

```ts
import { RoleNamespace } from '@concepta/nestjs-role';

// For generated CRUD controllers, pass via extraDecorators:
CrudModule.forFeature<RoleInterface>({
  crud: {
    controller: {
      entity: ROLE_ENTITY_KEY,
      path: 'role',
      extraDecorators: [RoleNamespace({ name: ROLE_ENTITY_KEY })],
      // ...
    },
  },
})
```

### How It Works

1. `RoleContextOverlay` reads `@RoleNamespace` metadata via `Reflector`
2. `RoleContextOverlay` extends `ContextOverlayInterceptor` and is registered
   as a global `APP_INTERCEPTOR`. Its `attach()` method resolves
   the namespace and calls `ctx.defineOverlay(RoleCtx, resolved)`
3. Gateway request handlers use `@Ctx(RoleCtx)` (or `ctx.with(RoleCtx)`)
   to get `{ namespace }`, used as the entity key for repository resolution

## Domain Aggregates

### Role

Extends `DomainAggregate<RoleInterface>`.

| Property | Type |
| --- | --- |
| `id` | `string` |
| `name` | `string` |
| `description` | `string` |
| `version` | `number` |
| `meta` | `AggregateMetaInterface` (dateCreated, dateUpdated, dateDeleted) |

| Method | Description | Event |
| --- | --- | --- |
| `Role.create(ctx, props)` | Create with generated UUID | `RoleCreatedEvent` |
| `Role.createWithId(ctx, id, props)` | Create with explicit ID | `RoleCreatedEvent` |
| `update(ctx, dto)` | Partial update, bumps version | `RoleUpdatedEvent` |
| `replace(ctx, dto)` | Full replacement, bumps version | `RoleReplacedEvent` |
| `toPlain()` | Returns `{ id, version, ...props, ...meta }` | — |

Reconstitution from a database entity is handled by `RoleMapper`.

### RoleAssignment

Extends `DomainAggregate<RoleAssignmentInterface>`.

| Property | Type |
| --- | --- |
| `id` | `string` |
| `roleId` | `string` |
| `assigneeId` | `string` |
| `version` | `number` |
| `meta` | `AggregateMetaInterface` (dateCreated, dateUpdated, dateDeleted) |

| Method | Description | Event |
| --- | --- | --- |
| `RoleAssignment.create(ctx, props)` | Create assignment | `RoleAssignedEvent` |
| `revoke(ctx)` | Mark for revocation | `RoleRevokedEvent` |
| `toPlain()` | Returns `{ id, version, ...props, ...meta }` | — |

Reconstitution from a database entity is handled by `RoleAssignmentMapper`.

## Commands

All commands execute within a `TransactionScope`. Domain events are committed
on transaction success and uncommitted on rollback.

| Command | Input | Returns | Description |
| --- | --- | --- | --- |
| `CreateRoleCommand` | `ctx, namespace, dto` | `Role` | Create a new role |
| `UpdateRoleCommand` | `ctx, namespace, id, dto` | `Role` | Partial update |
| `ReplaceRoleCommand` | `ctx, namespace, id, dto` | `Role` | Full replacement (upsert) |
| `RemoveRoleCommand` | `ctx, namespace, id` | `void` | Hard delete |
| `AssignRoleCommand` | `ctx, namespace, roleId, assigneeId` | `RoleAssignment` | Assign a single role |
| `AssignRolesCommand` | `ctx, namespace, roleIds[], assigneeId` | `RoleAssignment[]` | Assign multiple roles |
| `RevokeRoleCommand` | `ctx, namespace, roleId, assigneeId` | `void` | Revoke a single role |
| `RevokeRolesCommand` | `ctx, namespace, roleIds[], assigneeId` | `void` | Revoke multiple roles |

**Conflict detection:** `AssignRoleCommand` and `AssignRolesCommand` check for
existing assignments and throw `RoleAssignmentConflictException` or
`RoleAssignmentsConflictException` if duplicates are found.

## Queries

| Query | Input | Returns | Description |
| --- | --- | --- | --- |
| `GetRoleQuery` | `ctx, namespace, id` | `Role` | Get role by ID (throws if not found) |
| `GetRoleAssignmentQuery` | `ctx, namespace, id` | `RoleAssignment` | Get assignment by ID |
| `GetAssignedRolesQuery` | `ctx, namespace, assigneeId` | `RoleAssignment[]` | All assignments for an assignee |
| `IsAssignedRoleQuery` | `ctx, namespace, roleId, assigneeId` | `boolean` | Check single assignment |
| `IsAssignedRolesQuery` | `ctx, namespace, roleIds[], assigneeId` | `boolean` | Check all roles assigned |

## Domain Events

Subscribe to these events via `@nestjs/cqrs` event handlers (sagas or
`@EventsHandler` classes):

| Event | Payload | Emitted by |
| --- | --- | --- |
| `RoleCreatedEvent` | `eventContext, role` | `Role.create` / `Role.createWithId` |
| `RoleUpdatedEvent` | `eventContext, role` | `Role.update` |
| `RoleReplacedEvent` | `eventContext, role` | `Role.replace` |
| `RoleAssignedEvent` | `eventContext, assignment` | `RoleAssignment.create` |
| `RoleRevokedEvent` | `eventContext, assignment` | `RoleAssignment.revoke` |

Events are published after the transaction commits. Each event carries an
`EventContextHost<RoleEventHeaderInterface>` with the namespace header.

### Subscribing to Events

```ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RoleAssignedEvent } from '@concepta/nestjs-role';

@EventsHandler(RoleAssignedEvent)
export class RoleAssignedHandler implements IEventHandler<RoleAssignedEvent> {
  handle(event: RoleAssignedEvent) {
    const { assignment, eventContext } = event;
    // React to role assignment...
  }
}
```

## CRUD Gateway (Optional)

The module exports request classes and request handlers that bridge HTTP
operations to the CQRS bus. These are building blocks — you wire them into a
controller via `CrudModule.forFeature()` from `@concepta/nestjs-crud`.

No controller is exported. You generate one through the CRUD module
configuration.

```ts
import {
  CreateRoleRequest,
  CreateRoleRequestHandler,
  // ...
} from '@concepta/nestjs-role/optional/crud';
```

### Available Request/Handler Pairs

**Roles:**

| Operation | Request | Handler |
| --- | --- | --- |
| List | `ListRolesRequest` | `ListRolesRequestHandler` |
| Read | `ReadRoleRequest` | `ReadRoleRequestHandler` |
| Create | `CreateRoleRequest` | `CreateRoleRequestHandler` |
| Update | `UpdateRoleRequest` | `UpdateRoleRequestHandler` |
| Replace | `ReplaceRoleRequest` | `ReplaceRoleRequestHandler` |
| Delete | `DeleteRoleRequest` | `DeleteRoleRequestHandler` |

**Role Assignments:**

| Operation | Request | Handler |
| --- | --- | --- |
| List | `ListRoleAssignmentsRequest` | `ListRoleAssignmentsRequestHandler` |
| Read | `ReadRoleAssignmentRequest` | `ReadRoleAssignmentRequestHandler` |
| Create | `CreateRoleAssignmentRequest` | `CreateRoleAssignmentRequestHandler` |
| Delete | `DeleteRoleAssignmentRequest` | `DeleteRoleAssignmentRequestHandler` |

### Wiring a Role Controller

Use `CrudModule.forFeature()` to generate a controller that dispatches through
the role request handlers:

```ts
import { Module } from '@nestjs/common';
import { Operation } from '@concepta/nestjs-core';
import { CrudModule, CrudCqrsResolver } from '@concepta/nestjs-crud';
import {
  RoleInterface,
  roleCreateSchema,
  roleUpdateSchema,
  roleSchema,
  RoleNamespace,
} from '@concepta/nestjs-role';
import {
  rolePaginatedSchema,
  ListRolesRequest,
  ListRolesRequestHandler,
  ReadRoleRequest,
  ReadRoleRequestHandler,
  CreateRoleRequest,
  CreateRoleRequestHandler,
  UpdateRoleRequest,
  UpdateRoleRequestHandler,
  ReplaceRoleRequest,
  ReplaceRoleRequestHandler,
  DeleteRoleRequest,
  DeleteRoleRequestHandler,
} from '@concepta/nestjs-role/optional/crud';

const ROLE_ENTITY_KEY = 'role';

@Module({
  imports: [
    CrudModule.forFeature<RoleInterface>({
      crud: {
        controller: {
          entity: ROLE_ENTITY_KEY,
          path: 'role',
          resolver: CrudCqrsResolver,
          transactional: true,
          extraDecorators: [RoleNamespace({ name: ROLE_ENTITY_KEY })],
          request: { body: roleCreateSchema },
          response: {
            resource: roleSchema,
            paginated: rolePaginatedSchema,
          },
        },
        operations: [
          {
            operation: Operation.List,
            query: ListRolesRequest,
            queryHandler: ListRolesRequestHandler,
          },
          {
            operation: Operation.Read,
            query: ReadRoleRequest,
            queryHandler: ReadRoleRequestHandler,
          },
          {
            operation: Operation.Create,
            request: { body: roleCreateSchema },
            command: CreateRoleRequest,
            commandHandler: CreateRoleRequestHandler,
          },
          {
            operation: Operation.Update,
            request: { body: roleUpdateSchema },
            command: UpdateRoleRequest,
            commandHandler: UpdateRoleRequestHandler,
          },
          {
            operation: Operation.Replace,
            request: { body: roleCreateSchema },
            command: ReplaceRoleRequest,
            commandHandler: ReplaceRoleRequestHandler,
          },
          {
            operation: Operation.Delete,
            command: DeleteRoleRequest,
            commandHandler: DeleteRoleRequestHandler,
          },
        ],
      },
    }),
  ],
})
export class RoleHttpModule {}
```

Note that `rolePaginatedSchema` and `roleAssignmentPaginatedSchema`, like the
request/handler classes and batch schemas, come from `optional/crud` — only
the non-paginated core schemas live in the MAIN entry
(`@concepta/nestjs-role`). Builder-generated controllers derive request body
validation from `operations[].request.body` automatically; a handwritten
`@CrudController` class would need an explicit `@CrudBody({ schema })` for
runtime validation.

This generates the following endpoints:

| Method | Path | Operation |
| --- | --- | --- |
| GET | `/role` | List (paginated) |
| GET | `/role/:id` | Read |
| POST | `/role` | Create |
| PATCH | `/role/:id` | Update |
| PUT | `/role/:id` | Replace |
| DELETE | `/role/:id` | Delete |

The same pattern applies for role assignments — wire
`CreateRoleAssignmentRequest`/`CreateRoleAssignmentRequestHandler` and the
other assignment pairs into a second `CrudModule.forFeature()` call.

### Request Flow

```text
HTTP Request
  → CrudContextInterceptor (parses params, query)
  → CRUD Request (e.g. CreateRoleRequest)
  → Request Handler (bridges to CommandBus/QueryBus)
  → Command/Query Handler (domain logic + transaction)
  → Domain Aggregate (applies events)
  → Repository (persists)
  → Transaction commits → Events published
```

## Schemas

All schemas are Zod v4 objects (Standard Schema compatible), replacing the
legacy class-validator DTO classes.

### Core Schemas (always available)

Exported from `@concepta/nestjs-role`:

| Schema | Conforms To | Fields |
| --- | --- | --- |
| `roleSchema` | `RoleInterface` | `id`, `name`, `description`, audit fields (named OpenAPI component `Role`) |
| `roleCreateSchema` | `RoleCreatableInterface` | `name` (required, non-blank), `description` (defaults to `''`) |
| `roleUpdateSchema` | `RoleUpdatableInterface` | `name`, `description` (both optional — a partial update) |
| `roleAssignmentSchema` | `RoleAssignmentInterface` | `id`, `roleId`, `assigneeId`, audit fields |
| `roleAssignmentCreateSchema` | `RoleAssignmentCreatableInterface` | `roleId`, `assigneeId` |

`roleCreateSchema` requires a non-blank `name` (`.trim().min(1)`) and
defaults an omitted `description` to `''`. `roleUpdateSchema` is a true
partial — both fields are `.optional()`, so an omitted field is left
untouched rather than overwritten; a present-but-blank `name` is still
rejected. An empty `{}` body is accepted as a no-op patch.

### CRUD Schemas (optional)

Exported from `@concepta/nestjs-role/optional/crud`:

| Schema | Purpose |
| --- | --- |
| `rolePaginatedSchema` | Paginated role list response |
| `roleAssignmentPaginatedSchema` | Paginated assignment list response |
| `roleCreateBatchSchema` | Bulk role creation request |
| `roleAssignmentCreateBatchSchema` | Bulk assignment creation request |

## Exceptions

| Exception | HTTP Status | Error Code | Context |
| --- | --- | --- | --- |
| `RoleException` | — | `ROLE_ERROR` | Base exception |
| `RoleNotFoundException` | 404 | `ROLE_NOT_FOUND_ERROR` | `{ id }` |
| `RoleAssignmentNotFoundException` | 404 | `ROLE_ASSIGNMENT_NOT_FOUND_ERROR` | `{ assignmentId }` |
| `RoleAssignmentConflictException` | 409 | `ROLE_ASSIGNMENT_CONFLICT_ERROR` | `{ roleId, assigneeId }` |
| `RoleAssignmentsConflictException` | 409 | `ROLE_ASSIGNMENTS_CONFLICT_ERROR` | `{ assigneeId }` |
| `RoleEntityNotFoundException` | — | `ROLE_ENTITY_NOT_FOUND_ERROR` | `{ entityName }` |

All exceptions extend `RoleException`, which extends `RuntimeException` from
`@concepta/nestjs-core`. `RuntimeException` extends NestJS's
`HttpException`, so no exception filter registration is needed — errors
serialize over the wire as `{ statusCode, message, errorCode, error? }`
(no `timestamp`).

## Seeding (Optional)

When `@concepta/typeorm-seeding` and `@faker-js/faker` are installed, a
`RoleFactory` is available for generating seed data.

```ts
import { RoleFactory } from '@concepta/nestjs-role/optional/seeding';
```

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-role` | Module, aggregates, commands, queries, events, handlers, schemas, repositories, context overlay, exceptions, domain interfaces |
| `@concepta/nestjs-role/optional/crud` | CRUD request/handler classes, paginated schemas, batch schemas |
| `@concepta/nestjs-role/optional/typeorm` | `RoleSqliteEntity`, `RolePostgresEntity`, `RoleAssignmentSqliteEntity`, `RoleAssignmentPostgresEntity` |
| `@concepta/nestjs-role/optional/seeding` | `RoleFactory` |
