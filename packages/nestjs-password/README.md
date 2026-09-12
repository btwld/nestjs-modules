# @concepta/nestjs-password

Password utilities module for NestJS using DDD/CQRS. Provides password
hashing, strength validation, current password enforcement, and history
checking via four domain services and a configurable policy.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-password)](https://www.npmjs.com/package/@concepta/nestjs-password)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-password)](https://www.npmjs.com/package/@concepta/nestjs-password)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-password%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [Password Policy](#password-policy)
- [Domain Services](#domain-services)
- [Commands](#commands)
- [Exceptions](#exceptions)
- [Environment Variables](#environment-variables)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-password @nestjs/common @nestjs/config @nestjs/core
```

Requirements: the package is **ESM-only** (no CommonJS build), targets
**Node.js >= 22.12**, and runs on **NestJS 12**.

### Dependencies

| Package | Notes |
| --- | --- |
| `@concepta/nestjs-core` | `RuntimeException` base class, reference types, utilities |
| `bcrypt` | Password hashing |
| `zxcvbn` | Password strength evaluation |

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS 12 framework |
| `@nestjs/core` | Yes | Required by `@nestjs/cqrs` |
| `@nestjs/config` | Yes | Configuration module |
| `@nestjs/cqrs` | No | Optional peer — required in practice, the command bus |

## Module Registration

### Synchronous

```ts
import { PasswordModule, PasswordStrengthEnum } from '@concepta/nestjs-password';

@Module({
  imports: [
    PasswordModule.register({
      settings: {
        minPasswordStrength: PasswordStrengthEnum.Strong,
        requireCurrentToUpdate: true,
      },
    }),
  ],
})
export class AppModule {}
```

### Asynchronous

```ts
import { PasswordModule, PasswordStrengthEnum } from '@concepta/nestjs-password';

@Module({
  imports: [
    PasswordModule.registerAsync({
      useFactory: async () => ({
        settings: {
          minPasswordStrength: PasswordStrengthEnum.Strong,
        },
      }),
    }),
  ],
})
export class AppModule {}
```

`register()` / `registerAsync()` register the module **locally** (scoped to
the importing module).

`forRoot()` / `forRootAsync()` register the module **globally**.

`forFeature()` creates a standalone set of password providers (policy,
services, command handlers) for use in sub-modules.

### Options

```ts
interface PasswordOptionsInterface {
  settings?: PasswordSettingsInterface;
}

interface PasswordSettingsInterface {
  minPasswordStrength?: PasswordStrengthEnum;  // Minimum zxcvbn score
  requireCurrentToUpdate?: boolean;            // Require current password on update
}
```

## Architecture Overview

```text
Application (Commands)
  |
Domain (Services, Policy, Exceptions, CryptUtil)
  |
Infrastructure (Config)
```

- **Domain** -- `PasswordPolicy` (configurable policy), four domain services,
  domain exceptions, `CryptUtil` (bcrypt abstraction; internal — not exported
  from the package barrel)
- **Application** -- 4 commands dispatched via `@nestjs/cqrs`
- **Infrastructure** -- Configuration with environment variable support

Password primitives are defined and exported by **this package**:
`PasswordPlainInterface`, `PasswordPlainCurrentInterface`,
`PasswordStorageInterface`, `PasswordUpdateInterface`, and the
`isPasswordStorage` type guard.

## Password Policy

`PasswordPolicy` encapsulates configurable password rules (its settings
constructor argument is typed as `PasswordPolicySettings`, also exported). It
is registered as a NestJS provider and injected into services.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `minPasswordStrength` | `PasswordStrengthEnum` | `None` (production: `VeryStrong`) | Minimum zxcvbn score (0-4) |
| `requireCurrentToUpdate` | `boolean` | `false` | Require current password when updating |

### PasswordStrengthEnum

| Value | Score | Description |
| --- | --- | --- |
| `None` | 0 | No strength requirement |
| `Weak` | 1 | Weak password |
| `Medium` | 2 | Medium strength |
| `Strong` | 3 | Strong password |
| `VeryStrong` | 4 | Very strong password |

## Domain Services

Each service has a matching exported contract interface:
`PasswordCreationServiceInterface`, `PasswordStorageServiceInterface`,
`PasswordValidationServiceInterface`, and `PasswordStrengthServiceInterface` —
implement one of these to swap in a custom provider.

### PasswordCreationService

Orchestrates password creation with policy enforcement.

| Method | Signature | Description |
| --- | --- | --- |
| `create` | `(password: string) => Promise<PasswordStorageInterface>` | Hash password after strength check |
| `validateCurrent` | `(options) => Promise<boolean>` | Validate current password (throws `PasswordCurrentRequiredException` if required and missing) |
| `validateHistory` | `(options) => Promise<boolean>` | Check password against history (throws `PasswordUsedRecentlyException` on match) |

### PasswordStorageService

Handles password hashing via bcrypt.

| Method | Signature | Description |
| --- | --- | --- |
| `hash` | `(password: string) => Promise<PasswordStorageInterface>` | Hash a plain password |
| `hashObject` | `(object, options?) => Promise<...>` | Hash the `password` field of an object, returning the object with `passwordHash` replacing `password` |

### PasswordValidationService

Validates a plain password against a stored hash.

| Method | Signature | Description |
| --- | --- | --- |
| `validate` | `(options: PasswordValidateOptionsInterface) => Promise<boolean>` | Compare plain password against hash |

### PasswordStrengthService

Evaluates password strength using zxcvbn.

| Method | Signature | Description |
| --- | --- | --- |
| `isStrong` | `(password: string) => boolean` | Returns `true` if zxcvbn score meets `minPasswordStrength` |

## Commands

| Command | Input | Returns | Description |
| --- | --- | --- | --- |
| `CreatePasswordCommand` | `password` | `PasswordStorageInterface` | Create and hash a password (with strength check) |
| `ValidatePasswordCommand` | `PasswordValidateOptionsInterface` | `boolean` | Validate plain password against hash |
| `ValidateCurrentPasswordCommand` | `password, target` | `boolean` | Validate current password against stored credentials |
| `ValidatePasswordHistoryCommand` | `password, targets[]` | `boolean` | Check password against credential history |

### Dispatching a Command

```ts
import { CommandBus } from '@nestjs/cqrs';
import {
  CreatePasswordCommand,
  ValidatePasswordCommand,
  PasswordStorageInterface,
} from '@concepta/nestjs-password';

// Create a hashed password
const storage = await this.commandBus.execute<
  CreatePasswordCommand,
  PasswordStorageInterface
>(new CreatePasswordCommand('my-secure-password'));

// Validate a password against a hash
const isValid = await this.commandBus.execute<
  ValidatePasswordCommand,
  boolean
>(new ValidatePasswordCommand({
  password: 'my-secure-password',
  passwordHash: storage.passwordHash,
}));
```

## Exceptions

| Exception | Description |
| --- | --- |
| `PasswordException` | Base password exception |
| `PasswordNotStrongException` | Password does not meet minimum strength |
| `PasswordRequiredException` | Password field is required but missing |
| `PasswordCurrentRequiredException` | Current password required by policy but not provided |
| `PasswordUsedRecentlyException` | Password matches a recent credential in history |

All exceptions extend `PasswordException`, which extends `RuntimeException`
from `@concepta/nestjs-core`. `RuntimeException` extends Nest's
`HttpException`, so no exception filter registration is needed — password
exceptions render on the wire as
`{ statusCode, message, errorCode, error? }` bodies (errorCode
`PASSWORD_ERROR` unless a subclass overrides it).

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PASSWORD_MIN_PASSWORD_STRENGTH` | `0` (production: `4`) | Minimum zxcvbn score (0-4) |
| `PASSWORD_REQUIRE_CURRENT_TO_UPDATE` | `false` | Require current password on update |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-password` | Module, policy, services, commands, command handlers, exceptions, enums, interfaces |
