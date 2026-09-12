# @concepta/nestjs-authentication

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-authentication)](https://www.npmjs.com/package/@concepta/nestjs-authentication)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-authentication)](https://www.npmjs.com/package/@concepta/nestjs-authentication)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-authentication%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

Comprehensive NestJS authentication module built on CQRS and clean architecture.
Includes local (username/password), JWT bearer, refresh token, password recovery,
email verification, and OAuth provider routing — all in a single, unified module.

Request validation and OpenAPI documentation are schema-first: every request
body is described by a native Zod v4 schema exposed through the
[Standard Schema](https://standardschema.dev) interface — there are no
class-validator DTO classes.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [End-to-End Example](#end-to-end-example)
- [Features](#features)
  - [JWT Bearer Authentication](#jwt-bearer-authentication)
  - [Local (Username/Password) Login](#local-usernamepassword-login)
  - [Refresh Tokens](#refresh-tokens)
  - [Password Recovery](#password-recovery)
  - [Email Verification](#email-verification)
  - [OAuth Provider Router](#oauth-provider-router)
- [Validation Schemas](#validation-schemas)
- [Configuration Reference](#configuration-reference)
  - [Module Options](#module-options)
  - [JWT Settings](#jwt-settings)
  - [Strategy Settings](#strategy-settings)
  - [MFA Settings](#mfa-settings)
  - [Port Settings](#port-settings)
  - [Extras](#extras)
- [Exceptions](#exceptions)
- [Advanced](#advanced)
  - [Two-Tier CQRS Architecture](#two-tier-cqrs-architecture)
  - [Custom Notification Commands](#custom-notification-commands)
  - [Disabling the Global Guard](#disabling-the-global-guard)
  - [Context Overlay](#context-overlay)
- [Exports Reference](#exports-reference)
- [Related Packages](#related-packages)

---

## Overview

`@concepta/nestjs-authentication` consolidates six authentication features
into a single package:

| Feature | What it provides |
|---|---|
| **JWT** | Bearer token verification, global APP_GUARD, `@AuthPublic`/`@AuthUser` |
| **Local** | Username/password login via `passport-local` |
| **Refresh** | Refresh token verification and re-issuance |
| **Recovery** | OTP-based password recovery (recover-login, recover-password, update-password) |
| **Verify** | OTP-based email/account verification |
| **Router** | `?provider=` query dispatch to named OAuth guards |

Internally the module is structured in three layers:

- **Domain** — aggregates, ports, policies, events, exceptions; zero framework
  dependencies.
- **Application** — CQRS command/query handlers that orchestrate the domain.
- **Infrastructure** — Passport strategies, JWT service, Zod request schemas,
  config, the `AuthUserContextOverlay` gateway.

A key design point: **Passport strategies never issue tokens.** A strategy
validates credentials and places the authenticated *user* on `request.user`.
Your controller then issues the access/refresh token pair by executing
`IssueAuthenticatedResponseCommand` on the `CommandBus`. This keeps
strategies transport-agnostic and token issuance overridable via
[ports](#port-settings).

OAuth provider strategies (Apple, GitHub, Google) live in separate packages
(`@concepta/nestjs-auth-apple`, `-github`, `-google`). This module provides
the `AuthRouterGuard` dispatcher that routes to them and the OAuth utility
types they depend on.

---

## Installation

```bash
yarn add @concepta/nestjs-authentication
```

Peer dependencies:

```bash
yarn add rxjs @nestjs/common @nestjs/config @nestjs/core @nestjs/swagger
```

`@nestjs/cqrs` is also a peer, marked optional in `peerDependenciesMeta`,
but is required in practice — every port-backed feature (recovery, verify,
OAuth router) dispatches through it.

Requirements:

- **ESM-only** — the package ships native ES modules (no CommonJS build).
- **Node.js >= 22.12**
- **NestJS 12**

Zod v4 and `@standard-schema/spec` are regular dependencies — you do not need
to install them yourself unless you author your own schemas.

---

## Quick Start

The minimal setup — JWT verification only, no local login, no MFA — requires
only `settings.jwt`:

```typescript
import { AuthenticationModule } from '@concepta/nestjs-authentication';

@Module({
  imports: [
    AuthenticationModule.forRoot({
      settings: {
        jwt: {
          access: {
            secret: process.env.JWT_ACCESS_SECRET,
            signOptions: { expiresIn: '15m' },
          },
          refresh: {
            secret: process.env.JWT_REFRESH_SECRET,
            signOptions: { expiresIn: '7d' },
          },
        },
        strategies: {
          jwt: {},      // activates JwtStrategy + global APP_GUARD
        },
      },
    }),
  ],
})
export class AppModule {}
```

All routes are protected by default. Mark public routes with `@AuthPublic()`.
When applying the decorator to an entire controller class, pass
`{ classLevel: true }` — without it, a runtime warning is emitted on every
request that hits the class-level decorator:

```typescript
import { AuthPublic } from '@concepta/nestjs-authentication';

// class level — explicit opt-in required
@AuthPublic({ classLevel: true })
@Controller('health')
export class HealthController {
  @Get()
  check() { return 'ok'; }
}

// method level — no option needed
@Controller('info')
export class InfoController {
  @AuthPublic()
  @Get()
  version() { return '1.0.0'; }
}
```

Activate additional features by adding keys to `settings.strategies` and
`settings.mfa` and supplying the corresponding `ports.*` settings. See the
[Configuration Reference](#configuration-reference) and the
[End-to-End Example](#end-to-end-example) below.

---

## End-to-End Example

This example wires up local login, refresh, and JWT bearer auth. The scenario:

- `POST /auth/login` — accepts `username`/`password`, returns
  `accessToken` + `refreshToken`.
- `POST /token/refresh` — accepts `refreshToken`, returns a new token pair.
- `GET /me` — returns the authenticated user (protected by the global JWT guard).

### Step 1 — Implement UserPort queries and handlers

The module needs to look up users by id, subject (JWT sub), username, and
email. You provide CQRS Query/Command classes that implement the port interfaces.

```typescript
// src/user/queries/get-user-by-username.query.ts
import { PlainLiteralObject } from '@nestjs/common';
import { Query } from '@nestjs/cqrs';
import {
  AuthenticationUserResult,
  GetUserByUsernameQueryInterface,
} from '@concepta/nestjs-authentication';

export class GetUserByUsernameQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByUsernameQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly username: string,
  ) {
    super();
  }
}
```

```typescript
// src/user/queries/get-user-by-username.handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticationUserResult } from '@concepta/nestjs-authentication';
import { GetUserByUsernameQuery } from './get-user-by-username.query';
import { UserEntity } from '../user.entity';

@QueryHandler(GetUserByUsernameQuery)
export class GetUserByUsernameHandler
  implements IQueryHandler<GetUserByUsernameQuery>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async execute(query: GetUserByUsernameQuery): Promise<AuthenticationUserResult> {
    return this.repo.findOne({ where: { username: query.username } });
  }
}
```

Repeat this pattern for `GetUserByIdQuery`, `GetUserBySubjectQuery`,
`GetUserByEmailQuery`, and `UpdateUserCommand` — each implementing the
corresponding interface exported from `@concepta/nestjs-authentication`
(`GetUserByIdQueryInterface`, `GetUserBySubjectQueryInterface`,
`GetUserByEmailQueryInterface`, `UpdateUserCommandInterface`).

### Step 2 — Implement PasswordPort commands

Password hashing and validation come from `@concepta/nestjs-password`. Its
`PasswordValidationService.validate()` takes the plain password and the stored
hash:

```typescript
// src/user/commands/validate-password.command.ts
import { PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';
import {
  ValidatePasswordCommandInterface,
} from '@concepta/nestjs-authentication';
import { ReferenceIdInterface } from '@concepta/nestjs-core';

export class ValidatePasswordCommand
  extends Command<boolean>
  implements ValidatePasswordCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly password: string,
    public readonly target: ReferenceIdInterface,
  ) {
    super();
  }
}
```

```typescript
// src/user/commands/validate-password.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PasswordValidationService } from '@concepta/nestjs-password';
import { ValidatePasswordCommand } from './validate-password.command';
import { UserRepository } from '../user.repository';

@CommandHandler(ValidatePasswordCommand)
export class ValidatePasswordHandler
  implements ICommandHandler<ValidatePasswordCommand>
{
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordValidationService: PasswordValidationService,
  ) {}

  async execute(command: ValidatePasswordCommand): Promise<boolean> {
    const user = await this.userRepo.findById(command.target.id);
    if (!user || !user.passwordHash) return false;
    return this.passwordValidationService.validate({
      password: command.password,
      passwordHash: user.passwordHash,
    });
  }
}
```

Alternatively, dispatch `ValidatePasswordCommand` from
`@concepta/nestjs-password` itself on the `CommandBus` — the package registers
its own `ValidatePasswordHandler` that performs the same check.

Provide `SetPasswordCommand` in the same way (implementing
`SetPasswordCommandInterface`).

### Step 3 — Wire up the module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthenticationModule } from '@concepta/nestjs-authentication';

import { GetUserByIdQuery } from './user/queries/get-user-by-id.query';
import { GetUserBySubjectQuery } from './user/queries/get-user-by-subject.query';
import { GetUserByUsernameQuery } from './user/queries/get-user-by-username.query';
import { GetUserByEmailQuery } from './user/queries/get-user-by-email.query';
import { UpdateUserCommand } from './user/commands/update-user.command';
import { ValidatePasswordCommand } from './user/commands/validate-password.command';
import { SetPasswordCommand } from './user/commands/set-password.command';
import { userQueryHandlers, userCommandHandlers } from './user/user.handlers';
import { passwordHandlers } from './user/password.handlers';

@Module({
  imports: [
    CqrsModule,
    AuthenticationModule.forRoot({
      settings: {
        jwt: {
          access: {
            secret: process.env.JWT_ACCESS_SECRET,
            signOptions: { expiresIn: '15m' },
          },
          refresh: {
            secret: process.env.JWT_REFRESH_SECRET,
            signOptions: { expiresIn: '7d' },
          },
        },
        strategies: {
          jwt: {},      // enable JwtStrategy + global APP_GUARD
          local: {},    // enable LocalStrategy
          refresh: {},  // enable RefreshStrategy
        },
      },
      ports: {
        user: {
          getByIdQuery: GetUserByIdQuery,
          getBySubjectQuery: GetUserBySubjectQuery,
          getByUsernameQuery: GetUserByUsernameQuery,
          getByEmailQuery: GetUserByEmailQuery,
          updateCommand: UpdateUserCommand,
        },
        password: {
          validateCommand: ValidatePasswordCommand,
          setPasswordCommand: SetPasswordCommand,
        },
        // user, password, otp, recoveryNotification, verifyNotification are
        // all required together once ports is provided (jwt/token are the
        // only optional pair, defaulting if omitted) — supply stubs or real
        // implementations depending on whether you enable settings.mfa.recovery / .verify
        otp: { /* ... */ },
        recoveryNotification: { /* ... */ },
        verifyNotification: { /* ... */ },
      },
    }),
  ],
  providers: [
    ...userQueryHandlers,
    ...userCommandHandlers,
    ...passwordHandlers,
  ],
})
export class AppModule {}
```

### Step 4 — Add login and refresh controllers

`LocalStrategy` validates the request body against the configured login schema
and calls `LocalService.validateUser()`, which invokes `UserPort` and
`PasswordPort`. The validated **user** is placed on `request.user` — the
strategy does not issue tokens. Your controller issues the token pair by
executing `IssueAuthenticatedResponseCommand`:

```typescript
// src/auth/local.controller.ts
import { Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthPublic,
  AuthUser,
  AuthenticatedResponseInterface,
  AuthenticatedUserInterface,
  IssueAuthenticatedResponseCommand,
  LocalGuard,
  authenticationResponseSchema,
  localLoginSchema,
} from '@concepta/nestjs-authentication';

// The body is consumed by the Passport strategy, not @Body(), so the
// OpenAPI body schema is provided manually via the schema's JSON Schema bridge.
const localLoginBodySchema = localLoginSchema['~standard'].jsonSchema?.input?.({
  target: 'openapi-3.0',
});

@Controller('auth/login')
@UseGuards(LocalGuard)
@AuthPublic({ classLevel: true })
@ApiTags('auth')
export class LocalController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiBody({
    schema: localLoginBodySchema,
    description: 'Schema containing username and password.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    standardSchema: authenticationResponseSchema,
    description: 'Schema containing an access token and a refresh token.',
  })
  @ApiUnauthorizedResponse()
  @Post()
  async login(
    @AuthUser() user: AuthenticatedUserInterface,
  ): Promise<AuthenticatedResponseInterface> {
    return this.commandBus.execute(
      new IssueAuthenticatedResponseCommand({}, user.id),
    );
  }
}
```

The refresh controller is shape-identical — `RefreshGuard` verifies the
refresh token, loads the user via `UserPort.getBySubject()`, and the
controller issues a fresh pair:

```typescript
// src/auth/refresh.controller.ts
import { Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthPublic,
  AuthUser,
  AuthenticatedResponseInterface,
  AuthenticatedUserInterface,
  IssueAuthenticatedResponseCommand,
  RefreshGuard,
  authenticationResponseSchema,
  refreshSchema,
} from '@concepta/nestjs-authentication';

const refreshBodySchema = refreshSchema['~standard'].jsonSchema?.input?.({
  target: 'openapi-3.0',
});

@Controller('token/refresh')
@UseGuards(RefreshGuard)
@AuthPublic({ classLevel: true })
@ApiTags('auth')
export class RefreshController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiBody({
    schema: refreshBodySchema,
    description: 'Schema containing a refresh token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    standardSchema: authenticationResponseSchema,
    description: 'Schema containing an access token and a refresh token.',
  })
  @ApiUnauthorizedResponse()
  @Post()
  async refresh(
    @AuthUser() user: AuthenticatedUserInterface,
  ): Promise<AuthenticatedResponseInterface> {
    return this.commandBus.execute(
      new IssueAuthenticatedResponseCommand({}, user.id),
    );
  }
}
```

```typescript
// src/me/me.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AuthUser } from '@concepta/nestjs-authentication';

@Controller('me')
export class MeController {
  @Get()
  profile(@AuthUser() user: unknown) {
    return user;
  }
}
```

### Step 5 — Test with curl

```bash
# Obtain tokens
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "s3cr3t"}'
# => { "accessToken": "eyJ...", "refreshToken": "eyJ..." }

# Access a protected route
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer eyJ..."

# Refresh tokens
curl -X POST http://localhost:3000/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJ..."}'
# => { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

The response bodies match `authenticationResponseSchema`, which is published
to OpenAPI as the named component `AuthenticationResponse`.

---

## Features

### JWT Bearer Authentication

Activated by setting `settings.strategies.jwt`. Registers a global `APP_GUARD`
that enforces JWT verification on every route. Token extraction defaults to
`Authorization: Bearer <token>`.

**Decorators:**

- `@AuthPublic()` — exempts a route handler from the global guard. At class
  level, pass `@AuthPublic({ classLevel: true })` to make the intent explicit;
  a class-level `@AuthPublic()` without the option triggers a runtime warning
  on every request.
- `@AuthUser()` — injects the verified user object into a route parameter.

```typescript
import { AuthPublic, AuthUser } from '@concepta/nestjs-authentication';

@AuthPublic({ classLevel: true })
@Controller('public')
export class PublicController {
  @Get()
  open() { return 'no token needed'; }
}

@Controller('private')
export class PrivateController {
  @Get('me')
  whoAmI(@AuthUser() user: unknown) {
    return user;
  }
}
```

**Detecting `@AuthPublic()`:**

`isAuthPublic()` reads the metadata `@AuthPublic()` sets, without depending
on the underlying metadata key — useful for building tooling (route audits,
a custom guard) that needs to know whether a route was marked public.
Checks every target given, not just the first:

```typescript
import { isAuthPublic } from '@concepta/nestjs-authentication';

isAuthPublic(context.getHandler(), context.getClass()); // boolean
```

**Guards exported:**

- `JwtGuard` — `AuthGuard('jwt')` subclass with `canDisable` support.
- `AuthGuard` — base factory function; use to build custom guards:
  `AuthGuard(strategyName, options?)`. See `AuthGuardOptions` and
  `AuthGuardCtr` for the option/constructor types.

**Custom token extraction:**

Configure `settings.strategies.jwt` with `jwtFromRequest` (a
`JwtFromRequestFunction` from `passport-jwt`) to change how tokens are
extracted. `ExtractJwt` is re-exported for convenience:

```typescript
import { ExtractJwt } from '@concepta/nestjs-authentication';

settings: {
  strategies: {
    jwt: {
      jwtFromRequest: ExtractJwt.fromUrlQueryParameter('token'),
    },
  },
}
```

---

### Local (Username/Password) Login

Activated by setting `settings.strategies.local`. Registers a `passport-local`
strategy. On each login request the strategy:

1. Validates the request body against the configured `loginSchema` by calling
   its Standard Schema `~standard.validate` method (throws
   `LocalInvalidLoginDataException` on schema issues).
2. Calls `LocalService.validateUser()`, which uses `UserPort.getByUsername()`
   to find the user and `PasswordPort.validate()` to verify the password.
3. Returns the validated **user**, which Passport places on `request.user`.

Token issuance is your controller's responsibility — execute
`IssueAuthenticatedResponseCommand(ctx, user.id)` on the `CommandBus` as shown
in the [End-to-End Example](#end-to-end-example).

**Exported symbols:** `LocalGuard`, `LocalService`, `localLoginSchema`,
`LocalCredentialsInterface`, `LocalServiceInterface`,
`LocalValidateUserInterface`.

**Customize field names and validation:**

```typescript
settings: {
  strategies: {
    local: {
      usernameField: 'email',      // default: 'username'
      passwordField: 'pass',       // default: 'password'
      loginSchema: myLoginSchema,  // optional StandardSchemaV1; default: localLoginSchema
    },
  },
}
```

`loginSchema` accepts any Standard Schema implementation — a plain Zod v4
schema works out of the box. The default `localLoginSchema` requires
`username` (max 255 chars) and `password` (max 72 chars). When you remap
`usernameField`/`passwordField`, the strategy validates an object keyed by
your custom field names, so a custom schema should declare those keys.

The default field names can also be set through the environment variables
`AUTH_LOCAL_USERNAME_FIELD` and `AUTH_LOCAL_PASSWORD_FIELD` (read by the
module's default config).

**Exceptions:** `LocalUnauthorizedException`, `LocalUsernameNotFoundException`,
`LocalUserInactiveException`, `LocalInvalidPasswordException`,
`LocalInvalidLoginDataException`, `LocalInvalidCredentialsException`.

---

### Refresh Tokens

Activated by setting `settings.strategies.refresh`. Registers a Passport
strategy that reads a refresh token from the request body (`refreshToken`
field by default), verifies it via `JwtPort`, and loads the user with
`UserPort.getBySubject()`. The **user** lands on `request.user`; your
controller issues the new access + refresh pair with
`IssueAuthenticatedResponseCommand` (see the
[End-to-End Example](#end-to-end-example)).

**Exported symbols:** `RefreshGuard`, `refreshSchema` (validates
`refreshToken` as a JWT via `z.jwt()`).

**Custom token extraction:**

```typescript
import { ExtractJwt } from '@concepta/nestjs-authentication';

settings: {
  strategies: {
    refresh: {
      jwtFromRequest: ExtractJwt.fromBodyField('token'),
    },
  },
}
```

**Exceptions:** `RefreshException`, `RefreshUnauthorizedException`.

---

### Password Recovery

Activated by setting `settings.mfa.recovery`. Provides the following flows,
all requiring `ports.otp` and `ports.recoveryNotification`:

| Flow | `RecoveryService` method | Description |
|---|---|---|
| Recover login | `recoverLogin(ctx, email)` | Sends the user's username to their email |
| Recover password | `recoverPassword(ctx, email)` | Generates an OTP passcode and sends it by email |
| Validate passcode | `validatePasscode(ctx, passcode)` | Validates the OTP passcode |
| Update password | `updatePassword(ctx, passcode, newPassword)` | Sets a new password and notifies the user |
| Revoke recoveries | `revokeAllUserPasswordRecoveries(ctx, email)` | Clears all active recovery OTPs for a user |

**Exported symbols:** `RecoveryService`, `recoveryRecoverLoginSchema`,
`recoveryRecoverPasswordSchema`, `recoveryUpdatePasswordSchema`,
`recoveryValidatePasscodeSchema`, `RecoveryRecoverLoginParamsInterface`,
`RecoveryRecoverPasswordParamsInterface`,
`RecoveryUpdatePasswordParamsInterface`,
`RecoveryValidatePasscodeParamsInterface`, `RecoveryException`,
`RecoveryOtpInvalidException`.

**Controller pattern:** validate bodies with the exported schemas via the
native `@Body()` schema option and `StandardSchemaValidationPipe`:

```typescript
import {
  Body,
  Controller,
  PlainLiteralObject,
  Post,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Ctx } from '@concepta/nestjs-core';
import {
  AuthPublic,
  RecoveryRecoverPasswordParamsInterface,
  RecoveryService,
  recoveryRecoverPasswordSchema,
} from '@concepta/nestjs-authentication';

@Controller('auth/recovery')
@AuthPublic({ classLevel: true })
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Post('/password')
  async recoverPassword(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: recoveryRecoverPasswordSchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    recoverPasswordParams: RecoveryRecoverPasswordParamsInterface,
  ): Promise<void> {
    await this.recoveryService.recoverPassword(
      ctx,
      recoverPasswordParams.email,
    );
  }
}
```

**Shipped OTP defaults** (override under `settings.mfa.recovery.otp`):

```typescript
settings: {
  mfa: {
    recovery: {
      otp: {
        namespace: 'userOtp',
        category: 'auth-recovery',
        type: 'uuid',
        expiresIn: '1h',
        duplicateStrategy: 'DEACTIVATE',
        rateSeconds: 60,    // min seconds between requests per user
        rateThreshold: 5,   // max requests within rateSeconds window
      },
    },
  },
}
```

**Notification dispatch:** Recovery events are dispatched fire-and-forget via
`RecoveryNotificationPort`, which calls `CommandBus.execute()` with the command
class you provide in `ports.recoveryNotification`. Register a `@CommandHandler`
for each command class in your application module. A rejecting handler is not
silent — see [Custom Notification Commands](#custom-notification-commands)
for the `NotificationSendFailedEvent` published on failure.

```typescript
ports: {
  recoveryNotification: {
    sendRecoverLoginNotificationCommand: SendRecoverLoginCommand,
    sendRecoverPasswordNotificationCommand: SendRecoverPasswordCommand,
    sendPasswordUpdatedNotificationCommand: SendPasswordUpdatedCommand,
  },
}
```

Each command receives `(ctx, email, ...params)` — see
`SendRecoverLoginNotificationCommandInterface`,
`SendRecoverPasswordNotificationCommandInterface`, and
`SendPasswordUpdatedNotificationCommandInterface` for the exact shapes.

---

### Email Verification

Activated by setting `settings.mfa.verify`. Provides OTP-based email
verification using two endpoints — send and confirm — and toggles the user's
`active` flag on successful confirmation.

**`VerifyService` methods:** `send(ctx, { email })`,
`validatePasscode(ctx, { passcode })`, `confirmUser(ctx, { passcode })`,
`revokeAllUserVerifyToken(ctx, { email })`.

**Exported symbols:** `VerifyService`, `verifySchema`, `verifyUpdateSchema`,
`VerifySendParamsInterface`, `VerifyConfirmParamsInterface`,
`VerifyException`, `VerifyOtpInvalidException`.

**Controller pattern** (same native `@Body()` schema option as recovery):

```typescript
import {
  Body,
  Controller,
  Patch,
  PlainLiteralObject,
  Post,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Ctx } from '@concepta/nestjs-core';
import {
  AuthPublic,
  VerifyConfirmParamsInterface,
  VerifySendParamsInterface,
  VerifyService,
  verifySchema,
  verifyUpdateSchema,
} from '@concepta/nestjs-authentication';

@Controller('auth/verify')
@AuthPublic({ classLevel: true })
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post('/send')
  async send(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: verifySchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    verifyParams: VerifySendParamsInterface,
  ): Promise<void> {
    await this.verifyService.send(ctx, { email: verifyParams.email });
  }

  @Patch('/confirm')
  async confirm(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: verifyUpdateSchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    verifyUpdateParams: VerifyConfirmParamsInterface,
  ): Promise<void> {
    const { passcode } = verifyUpdateParams;
    await this.verifyService.confirmUser(ctx, { passcode });
  }
}
```

**Shipped OTP defaults** (override under `settings.mfa.verify.otp`):

```typescript
settings: {
  mfa: {
    verify: {
      otp: {
        namespace: 'userOtp',
        category: 'auth-verify',
        type: 'uuid',
        expiresIn: '24h',
        duplicateStrategy: 'DEACTIVATE',
        rateSeconds: 60,
        rateThreshold: 5,
      },
    },
  },
}
```

**Notification dispatch:** `VerifyNotificationPort` fires
`sendVerifyNotificationCommand` via the command bus. The command receives
`(ctx, email, passcode, tokenExp)` — see `SendVerifyNotificationCommandInterface`.
A rejecting handler publishes `NotificationSendFailedEvent` — see
[Custom Notification Commands](#custom-notification-commands):

```typescript
ports: {
  verifyNotification: {
    sendVerifyNotificationCommand: SendVerifyCommand,
  },
}
```

---

### OAuth Provider Router

`AuthRouterGuard` dispatches auth requests to named provider guards based on
the `?provider=` query parameter. It does not implement any OAuth strategy
itself — the strategies live in downstream provider packages.

**Login flow:**

```text
GET /auth/login?provider=google   →   AuthRouterGuard   →   AuthGoogleGuard
```

**Callback flow** (OAuth `code` + `state`):

```text
GET /auth/callback?code=xxx&state={"provider":"google"}
  →   AuthRouterGuard (extracts provider from state JSON)
  →   AuthGoogleGuard
```

**Wiring provider guards:**

```typescript
import { AuthGoogleGuard } from '@concepta/nestjs-auth-google';

AuthenticationModule.forRoot({
  // ...settings + ports...
  guards: [
    { name: 'google', guard: new AuthGoogleGuard() },
    { name: 'github', guard: new AuthGithubGuard() },
  ],
})
```

The `AuthRouterGuard` is exported and can be applied to any controller:

```typescript
import { AuthRouterGuard, AuthPublic } from '@concepta/nestjs-authentication';

@AuthPublic()
@UseGuards(AuthRouterGuard)
@Get('login')
async login() {}

@AuthPublic()
@UseGuards(AuthRouterGuard)
@Get('callback')
async callback(@Req() req: Request) {
  return req.user;
}
```

**OAuth utility types** (used by provider packages, re-exported here):
`OAuthAuthenticateOptionsInterface`, `OAuthParamsInterface`,
`OAuthRequestInterface`, `processOAuthParams`.

**Router exceptions:** All router errors extend `AuthRouterException`, the
only router exception in the public exports. Client mistakes — a missing
`?provider=` parameter or a provider with no registered guard — are rejected
with **400 Bad Request**. Server-side misconfiguration (missing guard config,
invalid guard) surfaces as 500. An `HttpException` thrown by the delegated
provider guard (e.g. a Passport strategy rejecting credentials) is re-thrown
unchanged — the router does not rewrite its status or body. Any other
unexpected failure from the provider guard is wrapped as
`AuthRouterAuthenticationFailedException` with **500** and `fault: 'internal'`.

---

## Validation Schemas

All request/response bodies are described by Zod v4 schemas built with the
schema helpers from `@concepta/nestjs-core`:

- `conformsTo<T>()(schema)` — pins the schema's output type to a domain
  interface at compile time.
- `withOpenApi(schema)` — attaches a JSON Schema bridge so the schema can be
  rendered into OpenAPI (used for request bodies).
- `withNamedComponent(schema, name)` — additionally registers the schema as a
  named OpenAPI component (used for `authenticationResponseSchema` →
  `AuthenticationResponse`).

| Schema | Shape | Conforms to |
|---|---|---|
| `localLoginSchema` | `{ username: string (≤255), password: string (≤72) }` | `AuthenticationLoginInterface` |
| `refreshSchema` | `{ refreshToken: jwt }` | `AuthenticationRefreshInterface` |
| `authenticationResponseSchema` | `{ accessToken: string, refreshToken: string }` | `AuthenticatedResponseInterface` |
| `verifySchema` | `{ email: email }` | `VerifySendParamsInterface` |
| `verifyUpdateSchema` | `{ passcode: string (≤36) }` | `VerifyConfirmParamsInterface` |
| `recoveryRecoverLoginSchema` | `{ email: email }` | `RecoveryRecoverLoginParamsInterface` |
| `recoveryRecoverPasswordSchema` | `{ email: email }` | `RecoveryRecoverPasswordParamsInterface` |
| `recoveryUpdatePasswordSchema` | `{ passcode: string (≤36), newPassword: string (≤72) }` | `RecoveryUpdatePasswordParamsInterface` |
| `recoveryValidatePasscodeSchema` | `{ passcode: string (≤36) }` | `RecoveryValidatePasscodeParamsInterface` |

Two usage patterns:

- **Body consumed by your controller** — pass the schema to the native
  `@Body({ schema, pipes: [new StandardSchemaValidationPipe()] })` option;
  OpenAPI documentation is derived automatically.
- **Body consumed by a Passport strategy** (local login, refresh) — the
  strategy validates internally via the schema's `~standard.validate`; document
  the body manually:

  ```ts
  @ApiBody({
    schema: theSchema['~standard'].jsonSchema?.input?.({
      target: 'openapi-3.0',
    }),
  })
  ```

Responses are documented with
`@ApiResponse({ status, standardSchema: authenticationResponseSchema })`.

---

## Configuration Reference

### Module Options

```typescript
AuthenticationModule.forRoot({
  settings?: AuthenticationSettingsInterface;
  ports?: AuthenticationPortsInterface;
  // extras (passed as the second arg to setExtras):
  global?: boolean;            // forRoot sets this to true automatically
  appGuard?: false | CanActivate;
  guards?: AuthRouterGuardConfigInterface[];
})
```

`forRoot` / `forRootAsync` set `global: true` (module available app-wide).
`register` / `registerAsync` do not — use these for feature-scoped auth.

### JWT Settings

Configured under `settings.jwt` (see `JwtPolicySettingsInterface`). Both
`access` and `refresh` accept `TokenOptionsInterface`, which extends
`JwtModuleOptions` from `@nestjs/jwt` minus `secretOrPrivateKey` and
`secretOrKeyProvider` (and narrows `secret`/`publicKey` to `string | Buffer`).
`issuer`, `audience`, `algorithms` and `clockTolerance` (under
`signOptions`/`verifyOptions`) all pass straight through to the underlying
`@nestjs/jwt` calls, same as `expiresIn`.

```typescript
settings: {
  jwt: {
    access: {
      secret: process.env.JWT_ACCESS_SECRET,   // min 32 chars recommended
      signOptions: { expiresIn: '15m', issuer: 'my-app', audience: 'my-api' },
      verifyOptions: { issuer: 'my-app', audience: 'my-api' },
    },
    refresh: {
      secret: process.env.JWT_REFRESH_SECRET,  // must differ from access secret
      signOptions: { expiresIn: '7d' },
    },
  },
}
```

Asymmetric keys (RS256/ES256) work the same way, via `privateKey`/`publicKey`
instead of a shared `secret` — set `signOptions.algorithm`/`verifyOptions.algorithms`
to match:

```typescript
settings: {
  jwt: {
    access: {
      privateKey: process.env.JWT_ACCESS_PRIVATE_KEY, // sign
      publicKey: process.env.JWT_ACCESS_PUBLIC_KEY,   // verify
      signOptions: { algorithm: 'RS256', expiresIn: '15m' },
      verifyOptions: { algorithms: ['RS256'] },
    },
  },
}
```

`secretOrKeyProvider` — `@nestjs/jwt`'s hook for dynamic/JWKS key resolution
— is deliberately **not** part of `TokenOptionsInterface`: it's a
module-level construct, and this package always registers the underlying
`NestJwtModule` with empty options, resolving keys per call instead. Setting
it here would type-check and then silently never run. For JWKS or other
external token verification, override at the `JwtPort` tier instead — see
[Two-Tier CQRS Architecture](#two-tier-cqrs-architecture) below.

Defaults when `signOptions.expiresIn` is omitted: access = **1h**, refresh =
**24h** — and the module emits a `process.emitWarning`
(`ROCKETS_JWT_NO_EXPIRY`) urging you to set it explicitly. Warnings are also
emitted for secrets shorter than 32 characters (`ROCKETS_JWT_WEAK_SECRET`) and
for identical access/refresh secrets (`ROCKETS_JWT_SHARED_SECRET`). Use
separate secrets for access and refresh tokens.

### Strategy Settings

Presence of a strategy key activates that Passport strategy:

```typescript
settings: {
  strategies: {
    jwt?: JwtStrategyPolicySettingsInterface;     // { jwtFromRequest? }
    local?: LocalStrategyPolicySettingsInterface; // { usernameField?, passwordField?, loginSchema? }
    refresh?: RefreshStrategyPolicySettingsInterface; // { jwtFromRequest? }
  },
}
```

Omitting a strategy key entirely disables that strategy.
`loginSchema` is any `StandardSchemaV1` (default: `localLoginSchema`).

### MFA Settings

> **Naming note:** despite the name, this is OTP-based password recovery and
> email/account verification (see the [Features](#features) table above) —
> not a second factor at login. There is no login-time MFA step today.

Presence of an MFA key activates that feature:

```typescript
settings: {
  mfa: {
    recovery?: RecoveryPolicySettingsInterface; // { otp: OtpPolicySettingsInterface }
    verify?: VerifyPolicySettingsInterface;     // { otp: OtpPolicySettingsInterface }
  },
}
```

`OtpPolicySettingsInterface`:

```typescript
{
  otp: {
    category: string;           // groups OTPs (e.g. 'auth-recovery')
    namespace: string;          // OTP repository namespace (e.g. 'userOtp')
    type: string;               // OTP type (e.g. 'uuid', 'numeric')
    expiresIn: string;          // e.g. '1h'
    duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
    rateSeconds?: number;       // 0 disables rate limiting (emits warning)
    rateThreshold?: number;     // 0 disables rate limiting (emits warning)
  }
}
```

Shipped defaults (deep-merged with your settings): both features use
`namespace: 'userOtp'`, `type: 'uuid'`, `duplicateStrategy: 'DEACTIVATE'`,
`rateSeconds: 60`, `rateThreshold: 5`; recovery uses
`category: 'auth-recovery'` with `expiresIn: '1h'`, verify uses
`category: 'auth-verify'` with `expiresIn: '24h'`.

### Port Settings

Ports connect the module's domain layer to your application's CQRS handlers.
`jwt` and `token` are optional and fall back to built-in defaults; once `ports`
is provided, `user`, `password`, `otp`, `recoveryNotification` and
`verifyNotification` are all required together:

```typescript
ports: {
  jwt?: JwtPortSettings;                        // optional; defaults are used if omitted
  token?: TokenPortSettings;                    // optional; defaults are used if omitted
  user: UserPortSettings;                       // required
  password: PasswordPortSettings;               // required
  otp: OtpPortSettings;                         // required
  recoveryNotification: RecoveryNotificationPortSettings;  // required
  verifyNotification: VerifyNotificationPortSettings;       // required
}
```

Each setting object maps port methods to Command/Query constructor classes that
your application registers as CQRS handlers. See the
[End-to-End Example](#end-to-end-example) for a full wiring pattern.

**Built-in default commands/queries** (exported and reusable for `ports.token`):

| Symbol | Type |
|---|---|
| `IssueAccessTokenCommand` | `Command<string>` |
| `IssueRefreshTokenCommand` | `Command<string>` |
| `IssueAuthenticatedResponseCommand` | `Command<AuthenticatedResponseInterface>` |
| `VerifyAccessTokenQuery` | `Query<PlainLiteralObject>` |
| `VerifyRefreshTokenQuery` | `Query<PlainLiteralObject>` |
| `ValidateTokenQuery` | `Query<boolean>` |
| `ValidateAndVerifyAccessTokenQuery` | `Query<PlainLiteralObject>` |
| `ValidateAndVerifyRefreshTokenQuery` | `Query<PlainLiteralObject>` |

The built-in token handlers are always registered — point `ports.token` at
these classes if you do not need custom token-issuance logic.

### Extras

```typescript
AuthenticationModule.forRoot({
  // extras are passed directly alongside settings/ports:
  appGuard?: false | CanActivate;
  guards?: AuthRouterGuardConfigInterface[];
})
```

- `appGuard: false` — disables the global `APP_GUARD` entirely.
- `appGuard: MyCustomGuard` — replaces the default `JwtGuard` as the APP_GUARD.
- `guards` — registers named guards for `AuthRouterGuard` dispatch.

---

## Exceptions

All exceptions in this package extend `RuntimeException` from
`@concepta/nestjs-core`, which itself extends Nest's `HttpException` — no
custom exception filter registration is required. Errors render on the wire
as:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials.",
  "errorCode": "AUTH_LOCAL_INVALID_CREDENTIALS_ERROR",
  "error": "Unauthorized"
}
```

The full list of exported exception classes is in the
[Exports Reference](#exports-reference).

---

## Advanced

### Two-Tier CQRS Architecture

The module uses a two-tier CQRS chain for token operations:

```text
TokenPort
  ↓ dispatches IssueAccessTokenCommand
  → IssueAccessTokenHandler
      ↓ calls JwtPort.signAccessToken()
      → JwtPort dispatches SignAccessTokenCommand
        → SignAccessTokenHandler
            ↓ calls JwtService.sign()
```

This means you can override at either tier:

- **Override at the JwtPort tier** — provide custom `ports.jwt` settings to
  swap out the signing/verification CQRS classes (affects raw JWT operations).
- **Override at the TokenPort tier** — provide custom `ports.token` settings to
  swap out how access/refresh tokens are issued and verified.

Default `JwtPort` settings use the built-in `SignAccessTokenCommand`,
`SignRefreshTokenCommand`, `JwtVerifyAccessTokenQuery`, and
`JwtVerifyRefreshTokenQuery`.

#### Verifying externally-issued tokens (JWKS / OIDC)

By default, `JwtVerifyAccessTokenQuery` verifies tokens this module itself
issued, against `settings.jwt`. To accept tokens from an external identity
provider (Azure AD/Entra, Auth0, etc.) instead, provide a
`ports.jwt.verifyAccessTokenQuery` implementing `JwtVerifyTokenQueryInterface`
that verifies against the provider's JWKS endpoint (e.g. via `jwks-rsa`) and
checks `iss`/`aud` — this is the tier `create-verify-token-callback.util.ts`
wires into the JWT Passport strategy for you, so no other module code needs
to change.

This alone does not "log in" a caller: `JwtStrategy.validate` still calls
`UserPort.getBySubject` with the verified token's subject and throws
`JwtUnauthorizedException` if no matching local user exists (see
`infrastructure/strategies/jwt/jwt.strategy.ts`). Verifying an external
token and auto-provisioning a local user on first sight are two different
concerns — the latter needs either a pre-provisioning step or a custom
`UserPort`/strategy, not just a `ports.jwt` override. `nestjs-federated`
handles the adjacent "link this external identity to a local user" problem,
but performs no token verification itself.

### Custom Notification Commands

Recovery and verify notifications are dispatched fire-and-forget. The module
provides the port interface contracts; you provide the handlers:

```typescript
import { Command } from '@nestjs/cqrs';
import {
  SendRecoverPasswordNotificationCommandInterface,
} from '@concepta/nestjs-authentication';

export class SendRecoverPasswordCommand
  extends Command<void>
  implements SendRecoverPasswordNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
    public readonly passcode: string,
    public readonly tokenExp: Date,
  ) {
    super();
  }
}

@CommandHandler(SendRecoverPasswordCommand)
export class SendRecoverPasswordHandler
  implements ICommandHandler<SendRecoverPasswordCommand>
{
  constructor(private readonly mailer: MailerService) {}

  async execute(command: SendRecoverPasswordCommand): Promise<void> {
    await this.mailer.sendMail({
      to: command.email,
      template: 'recover-password',
      context: { passcode: command.passcode, expires: command.tokenExp },
    });
  }
}
```

If your command handler rejects, the port publishes `NotificationSendFailedEvent`
on the `EventBus` — it carries `ctx`, `email`, the command class, and an
`AuthenticationEmailException` wrapping the original error. Register an
`@EventsHandler(NotificationSendFailedEvent)` to log or retry; the send
itself is never retried by the module and the originating request is
unaffected.

### Disabling the Global Guard

To disable the global guard entirely:

```typescript
AuthenticationModule.forRoot({
  settings: { strategies: { jwt: {} } },
  appGuard: false,
})
```

To protect only specific routes, leave the global guard enabled and use
`@AuthPublic()` on handlers (or `@AuthPublic({ classLevel: true })` on
controllers) that should be publicly accessible.

To replace the default `JwtGuard` with a custom guard as the global APP_GUARD:

```typescript
import { JwtGuard } from '@concepta/nestjs-authentication';

class MyAppGuard extends JwtGuard {
  // override canActivate or handleRequest
}

AuthenticationModule.forRoot({
  settings: { strategies: { jwt: {} } },
  appGuard: new MyAppGuard(),
})
```

### Context Overlay

`AuthUserContextOverlay` is registered as an `APP_INTERCEPTOR` and publishes
`request.user` into the Rockets `AppContextHost` via the `AuthUserCtx`
overlay reference:

```typescript
import { AuthUserCtx } from '@concepta/nestjs-authentication';
import { getAppContext } from '@concepta/nestjs-core';

// In a handler or interceptor:
const { user } = getAppContext(request).with(AuthUserCtx);
```

This is exactly how the `@AuthUser()` decorator resolves the user, and it is
useful in command/query handlers that need access to the authenticated user
without taking it as a parameter.

---

## Exports Reference

### Module and Registration

| Symbol | Description |
|---|---|
| `AuthenticationModule` | `forRoot`, `forRootAsync`, `register`, `registerAsync` |
| `AuthenticationOptionsInterface` | Module options shape |
| `AuthenticationOptionsExtrasInterface` | Extras (appGuard, guards) shape |
| `AuthenticationPortsInterface` | Ports configuration shape |
| `AuthenticationSettingsInterface` | Settings shape (jwt, strategies, mfa, guards) |
| `AuthenticationStrategiesSettingsInterface` | `settings.strategies` shape |
| `AuthenticationMfaSettingsInterface` | `settings.mfa` shape |

### Guards and Strategies

| Symbol | Description |
|---|---|
| `JwtGuard` | JWT bearer guard (`AuthGuard('jwt')`) |
| `LocalGuard` | Local strategy guard (`AuthGuard('local')`) |
| `RefreshGuard` | Refresh token guard (`AuthGuard('refresh')`) |
| `AuthRouterGuard` | OAuth provider dispatcher |
| `AuthRouterGuardsRecord` | Named-guard record type for the router |
| `AuthRouterGuardConfigInterface` | `{ name, guard }` config entry |
| `AuthGuard` | Guard factory function |
| `AuthGuardOptions` | `{ canDisable? }` guard options |
| `AuthGuardCtr` | Guard constructor type |
| `JwtStrategy` | `passport-jwt` strategy |
| `JwtPassportStrategy` | Low-level Passport JWT strategy base |
| `JwtPassportOptionsInterface` | Options for `JwtPassportStrategy` |
| `PassportStrategyFactory` | Factory for creating Passport strategies |
| `createVerifyTokenCallback` | Builds a `JwtVerifyTokenCallback` from `JwtPort` |
| `JwtVerifyTokenCallback` | Token verification callback type |

### Decorators

| Symbol | Description |
|---|---|
| `@AuthPublic(options?)` | Exempts a route (or, with `{ classLevel: true }`, a controller) from the global guard |
| `AuthPublicOptions` / `AuthPublicMetadata` | Decorator option/metadata types |
| `@AuthUser()` | Injects the authenticated user into a route parameter |

### Schemas

| Symbol | Description |
|---|---|
| `authenticationResponseSchema` | Access + refresh token response (OpenAPI component `AuthenticationResponse`) |
| `localLoginSchema` | Default login body (`username`, `password`) |
| `refreshSchema` | Refresh request body (`refreshToken` as JWT) |
| `recoveryRecoverLoginSchema` | Recover-login request body |
| `recoveryRecoverPasswordSchema` | Recover-password request body |
| `recoveryUpdatePasswordSchema` | Update-password request body |
| `recoveryValidatePasscodeSchema` | Validate-passcode request body |
| `verifySchema` | Verify send request body |
| `verifyUpdateSchema` | Verify confirm request body |

### Services

| Symbol | Description |
|---|---|
| `JwtService` | Low-level JWT sign/verify service |
| `LocalService` | Username/password user validation (`validateUser`) |
| `RecoveryService` | Recovery flows (see [Password Recovery](#password-recovery)) |
| `VerifyService` | Verification flows (see [Email Verification](#email-verification)) |

### Ports

| Symbol | Description |
|---|---|
| `JwtPort` / `JwtPortSettings` | Sign/verify raw JWTs |
| `TokenPort` / `TokenPortSettings` | Issue/verify/validate access and refresh tokens |
| `UserPort` / `UserPortSettings` | User lookup and update |
| `PasswordPort` / `PasswordPortSettings` | Password validation and set |
| `OtpPort` / `OtpPortSettings` | OTP create/validate/clear |
| `RecoveryNotificationPort` / `RecoveryNotificationPortSettings` | Recovery email dispatch |
| `VerifyNotificationPort` / `VerifyNotificationPortSettings` | Verify email dispatch |
| `AUTHENTICATION_JWT_PORT_TOKEN` | Injection token for `JwtPort` |

**Port command/query contracts:** `SignTokenCommandInterface`,
`JwtVerifyTokenQueryInterface`, `IssueTokenCommandInterface`,
`VerifyTokenQueryInterface`, `ValidateTokenQueryInterface`,
`GetUserByIdQueryInterface`, `GetUserBySubjectQueryInterface`,
`GetUserByUsernameQueryInterface`, `GetUserByEmailQueryInterface`,
`UpdateUserCommandInterface`, `ValidatePasswordCommandInterface`,
`SetPasswordCommandInterface`, `CreateOtpCommandInterface`,
`ValidateOtpQueryInterface`, `ClearOtpCommandInterface`,
`SendRecoverLoginNotificationCommandInterface`,
`SendRecoverPasswordNotificationCommandInterface`,
`SendPasswordUpdatedNotificationCommandInterface`,
`SendVerifyNotificationCommandInterface`.

### Policies

| Symbol | Description |
|---|---|
| `JwtPolicy` / `JwtPolicySettingsInterface` | JWT signing settings (access/refresh secrets, expiry) |
| `JwtStrategyPolicy` / `JwtStrategyPolicySettingsInterface` | JWT Passport strategy settings |
| `LocalStrategyPolicy` / `LocalStrategyPolicySettingsInterface` | Local strategy settings (fields, `loginSchema`) |
| `RefreshStrategyPolicy` / `RefreshStrategyPolicySettingsInterface` | Refresh strategy settings |
| `GuardsPolicy` / `GuardsPolicySettingsInterface` | Guard enable/disable settings |
| `RecoveryPolicy` / `RecoveryPolicySettingsInterface` | Recovery OTP settings |
| `VerifyPolicy` / `VerifyPolicySettingsInterface` | Verify OTP settings |
| `OtpPolicy` / `OtpPolicySettingsInterface` | Base OTP policy |

### Domain Interfaces, Aggregates, and Events

| Symbol | Description |
|---|---|
| `Token` | Token lifecycle aggregate |
| `TokenIssuedEvent` | Emitted when a token is issued |
| `TokenRevokedEvent` | Emitted when a token is revoked |
| `NotificationSendFailedEvent` | Emitted when a verify/recovery notification send fails |
| `TokenInterface` / `TokenType` / `TokenCreatableInterface` | Token shapes |
| `TokenOptionsInterface` | Per-token JWT options (extends `JwtModuleOptions`) |
| `AuthenticatedUserInterface` | Shape of `request.user` |
| `AuthenticatedResponseInterface` | `{ accessToken, refreshToken }` |
| `AuthenticationLoginInterface` | Login credentials shape |
| `AuthenticationRefreshInterface` | `{ refreshToken }` shape |
| `AuthenticationAccessInterface` | `{ accessToken }` shape |
| `AuthorizationPayloadInterface` | JWT payload (`sub`, ...) |
| `AuthenticationUserInterface` / `AuthenticationUserResult` | UserPort result shapes |
| `AuthenticationOtpInterface` / `AuthenticationOtpCreatableInterface` | OtpPort shapes |
| `LocalCredentialsInterface` / `LocalValidateUserInterface` / `LocalServiceInterface` | Local login contracts |
| `RecoveryRecoverLoginParamsInterface` | `{ email }` |
| `RecoveryRecoverPasswordParamsInterface` | `{ email }` |
| `RecoveryUpdatePasswordParamsInterface` | `{ passcode, newPassword }` |
| `RecoveryValidatePasscodeParamsInterface` | `{ passcode }` |
| `VerifySendParamsInterface` | `{ email }` |
| `VerifyConfirmParamsInterface` | `{ passcode }` |

### Exception Classes

| Symbol | Description |
|---|---|
| `AuthenticationException` | Base domain exception |
| `AuthenticationEmailException` | Notification dispatch failure |
| `TokenException` | Base token exception |
| `TokenAlreadyRevokedException` | Token revoked twice |
| `AuthenticationAccessTokenException` | Access token error |
| `AuthenticationRefreshTokenException` | Refresh token error |
| `JwtException` | Base JWT exception |
| `JwtVerifyException` | JWT verification failure |
| `JwtAuthenticationException` | JWT auth failure |
| `JwtUnauthorizedException` | JWT strategy unauthorized |
| `LocalException` | Base local exception |
| `LocalUnauthorizedException` | Local strategy unauthorized |
| `LocalUsernameNotFoundException` | Username not found |
| `LocalUserInactiveException` | User is inactive |
| `LocalInvalidPasswordException` | Password mismatch |
| `LocalInvalidLoginDataException` | Login body failed schema validation |
| `LocalInvalidCredentialsException` | Credentials rejected |
| `RefreshException` | Base refresh exception |
| `RefreshUnauthorizedException` | Refresh strategy unauthorized |
| `RecoveryException` | Base recovery exception |
| `RecoveryOtpInvalidException` | Recovery OTP invalid |
| `VerifyException` | Base verify exception |
| `VerifyOtpInvalidException` | Verify OTP invalid |
| `AuthRouterException` | Base router exception (500 by default; `ProviderMissing`/`ProviderNotSupported` render 400. `AuthRouterGuard` classifies an unexpected provider-guard failure as 500/internal; an `HttpException` raised by the delegated guard is re-thrown unchanged.) |
| `AuthenticationUserPortRequiredException` | UserPort not configured |
| `AuthenticationFeatureConfigException` | Feature misconfiguration |

### Default CQRS Commands and Queries

| Symbol | Tier |
|---|---|
| `IssueAccessTokenCommand` | TokenPort |
| `IssueRefreshTokenCommand` | TokenPort |
| `IssueAuthenticatedResponseCommand` | TokenPort |
| `VerifyAccessTokenQuery` | TokenPort |
| `VerifyRefreshTokenQuery` | TokenPort |
| `ValidateTokenQuery` | TokenPort |
| `ValidateAndVerifyAccessTokenQuery` (+ `ValidateAndVerifyAccessTokenQueryInterface`) | TokenPort |
| `ValidateAndVerifyRefreshTokenQuery` (+ `ValidateAndVerifyRefreshTokenQueryInterface`) | TokenPort |
| `SignAccessTokenCommand` | JwtPort |
| `SignRefreshTokenCommand` | JwtPort |
| `JwtVerifyAccessTokenQuery` | JwtPort |
| `JwtVerifyRefreshTokenQuery` | JwtPort |

### Context Overlay Exports

| Symbol | Description |
|---|---|
| `AuthUserCtx` | `OverlayRef` for the authenticated user context |
| `AuthUserContextOverlay` | `APP_INTERCEPTOR` that publishes `request.user` |
| `AuthUserContextInterface` | Shape of the user context overlay |

### OAuth Utilities

| Symbol | Description |
|---|---|
| `processOAuthParams` | Extract and normalize OAuth callback params |
| `OAuthAuthenticateOptionsInterface` | Options passed to `passport.authenticate()` |
| `OAuthParamsInterface` | Normalized OAuth params (provider, state, code) |
| `OAuthRequestInterface` | Extended request with OAuth state |
| `ExtractJwt` / `JwtFromRequestFunction` | Re-exports from `passport-jwt` |

---

## Related Packages

**Runtime dependencies:**

- [`@concepta/nestjs-core`](../nestjs-core) — `AppContextHost`, `OverlayRef`,
  `ReferenceId`, schema helpers (`conformsTo`, `withOpenApi`,
  `withNamedComponent`), event/exception base classes.
- [`@concepta/nestjs-password`](../nestjs-password) — password hashing and
  validation (typically used in `PasswordPort` command handlers).
- [`@concepta/nestjs-user`](../nestjs-user) — ready-made user module with
  CQRS queries/commands that satisfy `UserPortSettings`.

**OAuth provider packages** (strategies, guards, and controllers live here):

- [`@concepta/nestjs-auth-apple`](../nestjs-auth-apple) — Apple OAuth2 strategy.
- [`@concepta/nestjs-auth-github`](../nestjs-auth-github) — GitHub OAuth2 strategy.
- [`@concepta/nestjs-auth-google`](../nestjs-auth-google) — Google OAuth2 strategy.
- [`@concepta/nestjs-federated`](../nestjs-federated) — Federated identity storage
  (required by all OAuth provider packages).

**OTP integration** (required for recovery and verify features):

- [`@concepta/nestjs-otp`](../nestjs-otp) — ready-made OTP module with CQRS
  queries/commands that satisfy `OtpPortSettings`.
