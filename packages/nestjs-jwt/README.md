# Rockets NestJS JWT

A flexible JWT utilities module for signing and validating tokens.

This module extends/wraps the [@nestjs/jwt](https://www.npmjs.com/package/@nestjs/jwt)
module.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-jwt)](https://www.npmjs.com/package/@concepta/nestjs-jwt)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-jwt)](https://www.npmjs.com/package/@concepta/nestjs-jwt)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Tutorials](#tutorials)
  - [Introduction](#introduction)
    - [Overview of the Library](#overview-of-the-library)
    - [Purpose and Key Features](#purpose-and-key-features)
    - [Installation](#installation)
  - [Basic Setup](#basic-setup)
  - [Creating custom jwtIssueService](#creating-custom-jwtissueservice)
  - [Environment Variables](#environment-variables)
- [How to Guides](#how-to-guides)
  - [1. How to Set Up JwtModule with forRoot](#1-how-to-set-up-jwtmodule-with-forroot)
  - [2. How to Configure JwtModule Settings](#2-how-to-configure-jwtmodule-settings)
  - [3. Overriding Defaults](#3-overriding-defaults)
    - [JwtAccessService](#jwtaccessservice)
    - [JwtRefreshService](#jwtrefreshservice)
    - [JwtIssueTokenService](#jwtissuetokenservice)
    - [JwtVerifyTokenService](#jwtverifytokenservice)
    - [JwtService](#jwtservice)
- [Explanation](#explanation)
  - [Conceptual Overview](#conceptual-overview)
    - [What is This Library?](#what-is-this-library)
    - [Benefits of Using This Library](#benefits-of-using-this-library)
  - [Design Choices](#design-choices)
    - [Global, Synchronous vs Asynchronous Registration](#global-synchronous-vs-asynchronous-registration)
  - [Integration Details](#integration-details)
    - [Integrating with Other Modules](#integrating-with-other-modules)

# Tutorials

## Introduction

### Overview of the Library

This module is designed to manage JWT authentication processes within a NestJS
application. It includes services for issuing JWTs, validating user credentials,
and verifying tokens. The services handle the generation of access and refresh
tokens, ensure users are active and meet authentication criteria, and perform
token validity checks, including additional validations if necessary. This
comprehensive approach ensures secure user authentication and efficient token
management.

### Purpose and Key Features

- **Secure Token Management**: Provides robust mechanisms for issuing and
  managing access and refresh tokens, ensuring secure and efficient token
  lifecycle management.
- **Abstract User Validation Service**: Offers an abstract service to validate
  user credentials and check user activity status, ensuring that only eligible
  users can authenticate. This abstract nature requires implementations to
  define specific validation logic, allowing flexibility across different user
  models and authentication requirements.
- **Token Verification**: Includes capabilities to verify the authenticity and
  validity of tokens, with support for additional custom validations to meet
  specific security requirements.
- **Customizable and Extensible**: Designed to be flexible, allowing
  customization of token generation, user validation, and token verification
  processes to suit different application needs.
- **Integration with NestJS Ecosystem**: Seamlessly integrates with other
  NestJS modules and services, leveraging the framework's features for enhanced
  functionality and performance.

### Installation

To get started, install the `JwtModule` package:

```sh
yarn add @concepta/nestjs-jwt
```

## Basic Setup

To set up the `JwtModule`, follow the basic setup tutorial in the
[nestjs-authentication README](https://github.com/conceptadev/nestjs-authentication).

## Creating custom jwtIssueService

Here we will cover how to override the default services in `JwtModule`.
For example, to override the `JwtIssueTokenService`, follow the steps below:

1. Create a custom implementation of `JwtIssueTokenService`:

```ts
import { Injectable } from '@nestjs/common';
import {
  JwtService,
  JwtSignServiceInterface,
  JwtIssueTokenServiceInterface,
} from '@concepta/nest-jwt';

@Injectable()
export class CustomJwtIssueTokenService implements JwtIssueTokenServiceInterface {
  constructor(
    private readonly jwtAccessService: JwtSignServiceInterface,
    private readonly jwtRefreshService: JwtSignServiceInterface,
  ) {}

  async accessToken(...args: Parameters<JwtIssueTokenServiceInterface['accessToken']>) {
    return this.jwtAccessService.signAsync(...args);
  }

  async refreshToken(...args: Parameters<JwtIssueTokenServiceInterface['refreshToken']>) {
    return this.jwtRefreshService.signAsync(...args);
  }
}
```

1. Provide the custom implementation in your module configuration:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@concepta/nestjs-jwt';
import { CustomJwtIssueTokenService } from './custom-jwt-issue-token.service';

@Module({
  imports: [
    JwtModule.forRoot({
      jwtIssueService: CustomJwtIssueTokenService,
      settings: {
        access: {
          secret: 'your-secret-key',
          signOptions: { expiresIn: '60s' },
        },
      },
    }),
  ],
  providers: [CustomJwtIssueTokenService],
})
export class AppModule {}
```

This example shows how to customize the `JwtIssueTokenService` with a custom
implementation. Similar steps can be followed to override other services in
`JwtModule`.

### Environment Variables

Configurations available via environment.

| Variable                        | Type                 | Default                    |                                 |
| ------------------------------- | -------------------- | -------------------------- | ------------------------------- |
| `JWT_MODULE_ACCESS_SECRET`      | `<string \| Buffer>` | `randomUUID()` \* see note | Access token secret             |
| `JWT_MODULE_ACCESS_EXPIRES_IN`  | `<string \| number>` | `'1h'`                     | Access token expiration length  |
| `JWT_MODULE_REFRESH_SECRET`     | `<string \| Buffer>` | copied from access secret  | Refresh token secret            |
| `JWT_MODULE_REFRESH_EXPIRES_IN` | `<string \| number>` | `'1y'`                     | Refresh token expiration length |

> \* For security reasons, a random UUID will only be generated for
> the default secret when `NODE_ENV !== 'production'`.

# How to Guides

## 1. How to Set Up JwtModule with forRoot

To set up the `JwtModule`, follow these steps:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@concepta/nestjs-jwt';

@Module({
  imports: [
    JwtModule.forRoot({}),
  ],
})
export class AppModule {}
```

This setup configures the `JwtModule` with global settings and integrates the
`JwtModule` for JWT-based authentication.

## 2. How to Configure JwtModule Settings

The `JwtModule` provides several configurable settings to customize its
behavior. Each setting can be defined in the module configuration and will
create default services to be used in other modules.

### Settings Example

Here is an example of how to configure each property of the settings:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@concepta/nestjs-jwt';

@Module({
  imports: [
    JwtModule.forRoot({
      settings: {
        access: {
          secret: 'your-secret-key',
          signOptions: { expiresIn: '60s' },
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 3. Overriding Defaults

To override the default services, you can provide custom implementations for
any of the services.

#### JwtAccessService

```ts
@Injectable()
import { JwtService, JwtSignOptions } from '@concepta/nest-jwt';
class CustomJwtAccessService extends JwtService {
  sign(_payload: string, _options?: JwtSignOptions): string {
    return 'foo';
  }
}
```

#### JwtRefreshService

```ts
@Injectable()
import { JwtService, JwtSignOptions } from '@concepta/nest-jwt';
class CustomRefreshJwtAccessService extends JwtService {
  sign(_payload: string, _options?: JwtSignOptions): string {
    return 'foo';
  }
}
```

#### JwtIssueTokenService

```ts
import { Injectable } from '@nestjs/common';
import {
  JwtService,
  JwtSignServiceInterface,
  JwtIssueTokenServiceInterface,
} from '@concepta/nest-jwt';

@Injectable()
export class CustomJwtIssueTokenService implements JwtIssueTokenServiceInterface {
  constructor(
    private readonly jwtAccessService: JwtSignServiceInterface,
    private readonly jwtRefreshService: JwtSignServiceInterface,
  ) {}

  async accessToken(...args: Parameters<JwtIssueTokenServiceInterface['accessToken']>) {
    // Custom implementation
    return this.jwtAccessService.signAsync(...args);
  }

  async refreshToken(...args: Parameters<JwtIssueTokenServiceInterface['refreshToken']>)   {
    // Custom implementation
    return this.jwtRefreshService.signAsync(...args);
  }
}
```

#### JwtVerifyTokenService

```ts
import { Injectable } from '@nestjs/common';
import {
  JwtService,
  JwtVerifyServiceInterface,
  JwtVerifyTokenServiceInterface,
} from '@concepta/nest-jwt';

@Injectable()
export class CustomJwtVerifyTokenService implements JwtVerifyTokenServiceInterface {
  constructor(private readonly jwtVerifyService: JwtVerifyServiceInterface) {}

  async accessToken(...args: Parameters<JwtVerifyTokenServiceInterface['accessToken']>) {
    // Custom implementation
    return this.jwtVerifyService.verifyAsync('access', ...args);
  }

  async refreshToken(...args: Parameters<JwtVerifyTokenServiceInterface['refreshToken']>) {
    // Custom implementation
    return this.jwtVerifyService.verifyAsync('refresh', ...args);
  }
}
```

#### JwtService

```ts
import { Inject, Injectable } from '@nestjs/common';
import { JwtServiceInterface } from '@concepta/nest-jwt';

@Injectable()
export class CustomJwtService implements JwtServiceInterface {
  async signAsync(
    ...rest: Parameters<JwtService['signAsync']>
  ) {
    // custom logic
  }

  async verifyAsync(
    ...rest: Parameters<JwtService['verifyAsync']>
  ) {
    // custom logic
  }

  decode(tokenType: JwtTokenType, ...rest: Parameters<JwtService['decode']>) {
    // custom logic
  }
}

```

1. Provide the custom implementations in your module configuration:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@concepta/nestjs-jwt';
import { CustomJwtIssueTokenService } from './custom-jwt-issue-token.service';
import { CustomJwtVerifyTokenService } from './custom-jwt-verify-token.service';

@Module({
  imports: [
    JwtModule.forRoot({
      jwtIssueService: CustomJwtIssueTokenService,
      jwtVerifyService: CustomJwtVerifyTokenService,
      settings: {
        access: {
          secret: 'your-secret-key',
          signOptions: { expiresIn: '60s' },
        },
      },
    }),
  ],
  providers: [CustomJwtIssueTokenService, CustomJwtVerifyTokenService],
})
export class AppModule {}
```

This example shows how to customize the `JwtIssueTokenService` and `JwtVerifyTokenService`
with custom implementations. Similar steps can be followed to override other
services in `JwtModule`.

# Explanation

## Conceptual Overview

### What is This Library?

The `nestjs-jwt` library is a comprehensive solution for managing authentication
processes within a NestJS application. It provides services for issuing JWTs,
validating user credentials, and verifying tokens. The library integrates
seamlessly with other modules in the `nestjs-auth` suite, making it a versatile
choice for various authentication needs.

### Benefits of Using This Library

- **Secure Token Management**: Robust mechanisms for issuing and managing access
  and refresh tokens.
- **Abstract User Validation Service**: Flexible user validation service that
  can be customized to meet specific requirements.
- **Token Verification**: Capabilities to verify the authenticity and validity
  of tokens, with support for additional custom validations.
- **Customizable and Extensible**: Designed to be flexible, allowing
  customization of token generation, user validation, and token verification
  processes.
- **Integration with NestJS Ecosystem**: Seamlessly integrates with other
  NestJS modules and services, leveraging the framework's features for enhanced
  functionality and performance.

### Design Choices

#### Global, Synchronous vs Asynchronous Registration

The `nestjs-jwt` module supports both synchronous and asynchronous registration:

- **Global Registration**: Makes the module available throughout the entire
  application. This approach is useful when JWT authentication is required
  across all or most routes in the application.
- **Synchronous Registration**: This method is used when the configuration
  options are static and available at application startup. It simplifies the
  setup process and is suitable for most use cases where configuration values do
  not depend on external services.
- **Asynchronous Registration**: This method is beneficial when configuration
  options need to be retrieved from external sources, such as a database or an
  external API, at runtime. It allows for more flexible and dynamic configuration
  but requires an asynchronous factory function.

### Integration Details

#### Integrating with Other Modules

The `nestjs-jwt` module integrates smoothly with other modules in the
`nestjs-auth` suite. Here are some integration details:

- **@concepta/nestjs-auth-jwt**: Use `@concepta/nestjs-auth-jwt` for JWT-based
  authentication. Configure it to handle the issuance and verification of JWT
  tokens.
- **@concepta/nestjs-auth-local**: Use `@concepta/nestjs-auth-local` for local
  authentication strategies such as username and password.
- **@concepta/nestjs-auth-recovery**: Use `@concepta/nestjs-auth-recovery` for
  account recovery processes like password reset.
- **@concepta/nestjs-auth-refresh**: Use `@concepta/nestjs-auth-refresh` for
  handling token refresh mechanisms.

By combining these modules, you can create a comprehensive authentication system
that meets various security requirements and user needs.
