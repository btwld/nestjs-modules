# Rockets NestJS Auth Guard Router

Route authentication requests to provider-specific guards based on query
parameters.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-auth-router)](https://www.npmjs.com/package/@concepta/nestjs-auth-router)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-auth-router)](https://www.npmjs.com/package/@concepta/nestjs-auth-router)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://google.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://google.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

1. [Tutorials](#tutorials)
   - [Introduction](#introduction)
   - [Getting Started with Auth Guard Router](#getting-started-with-auth-guard-router)
     - [Step 1: Install the Package](#step-1-install-the-package)
     - [Step 2: Configure Multiple Auth Guard Router Guards](#step-2-configure-multiple-auth-guard-router-guards)
     - [Step 3: Use the Auth Router Guard](#step-3-use-the-auth-router-guard)
2. [How-To Guides](#how-to-guides)
   - [Configuring Provider-Specific Guards](#configuring-provider-specific-guards)
   - [Creating Custom Controllers](#creating-custom-controllers)
   - [Error Handling](#error-handling)
3. [Reference](#reference)
4. [Explanation](#explanation)
   - [Overview of the Guard Router](#overview-of-the-guard-router)
   - [Provider-Based Routing](#provider-based-routing)
   - [Error Handling System](#error-handling-system)

## Tutorials

### Introduction

The `@concepta/nestjs-auth-router` module provides a guard router that
delegates authentication to provider-specific guards based on the `provider`
query parameter. This allows you to support multiple authentication providers
(Google, Facebook, GitHub, etc.) through a single unified interface.

**Important:** This module is a guard router only. It does not provide
authentication strategies or authentication logic itself. You need to implement
or use provider-specific guards (like `@concepta/nestjs-auth-google`) that
handle the actual authentication.

### Getting Started with Auth Guard Router

#### Step 1: Install the Package

To get started, install the `@concepta/nestjs-auth-router` package:

```bash
yarn add @concepta/nestjs-auth-router
```

#### Step 2: Configure Multiple Auth Guard Router Guards

Configure the Auth Guard Router module with your provider-specific guards. You
need to import the actual authentication provider modules that provide the
guards:

```ts
import { Module } from '@nestjs/common';
import { AuthRouterModule } from '@concepta/nestjs-auth-router';
import { AuthGoogleModule, AuthGoogleGuard } from '@concepta/nestjs-auth-google';
import { AuthFacebookModule, AuthFacebookGuard } from '@concepta/nestjs-auth-facebook';
import { AuthGitHubModule, AuthGitHubGuard } from '@concepta/nestjs-auth-github';

@Module({
  imports: [
    // Import the actual authentication provider modules
    AuthGoogleModule.forRoot({
      // Google-specific configuration
    }),
    AuthFacebookModule.forRoot({
      // Facebook-specific configuration
    }),
    AuthGitHubModule.forRoot({
      // GitHub-specific configuration
    }),
    // Configure the Auth Router with the guards from those modules
    AuthRouterModule.forRoot({
      guards: [
        { name: 'google', guard: AuthGoogleGuard },
        { name: 'facebook', guard: AuthFacebookGuard },
        { name: 'github', guard: AuthGitHubGuard },
      ],
    }),
  ],
})
export class AppModule {}
```

#### Step 3: Use the Auth Router Guard

Use the `AuthRouterGuard` in your controllers:

```ts
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuthRouterGuard } from '@concepta/nestjs-auth-router';

@Controller('auth')
@UseGuards(AuthRouterGuard)
export class AuthController {
  @Get('login')
  login(@Query('provider') provider: string): void {
    // The AuthRouterGuard will route to the appropriate provider guard
    // based on the provider query parameter
    return;
  }

  @Get('callback')
  callback(): string {
    // Handle the authentication callback
    return 'Authentication successful';
  }
}
```

## How-To Guides

### Configuring Provider-Specific Guards

You typically use existing authentication provider modules rather than creating
guards from scratch. For example, use `@concepta/nestjs-auth-google` for
Google authentication:

```ts
import { Module } from '@nestjs/common';
import { AuthRouterModule } from '@concepta/nestjs-auth-router';
import { AuthGoogleModule, AuthGoogleGuard } from '@concepta/nestjs-auth-google';

@Module({
  imports: [
    // Import the Google authentication module with its configuration
    AuthGoogleModule.forRoot({
      // Google authentication configuration (client ID, secret, etc.)
    }),
    // Configure the Auth Router to use the Google guard
    AuthRouterModule.forRoot({
      guards: [
        { name: 'google', guard: AuthGoogleGuard },
      ],
    }),
  ],
})
export class AppModule {}
```

If you need to create a custom authentication guard, it must implement the
`CanActivate` interface:

```ts
import { CanActivate, Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Implement your authentication logic here
    return true;
  }
}
```

Then register it in the module:

```ts
AuthRouterModule.forRoot({
  guards: [
    { name: 'custom', guard: CustomAuthGuard },
  ],
})
```

### Creating Custom Controllers

You can create custom controllers that use the Auth Guard Router guard:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthRouterGuard } from '@concepta/nestjs-auth-router';

@Controller('auth')
@UseGuards(AuthRouterGuard)
export class AuthController {
  @Get('login')
  login(): void {
    // Guard handles routing based on ?provider= query parameter
    return;
  }

  @Get('callback')
  callback(): { message: string } {
    return { message: 'Authentication callback handled' };
  }
}
```

### Error Handling

The Auth Guard Router guard provides specific exceptions for different error
scenarios:

```ts
import {
  AuthRouterProviderMissingException,
  AuthRouterProviderNotSupportedException,
  AuthRouterConfigNotAvailableException,
  AuthRouterGuardInvalidException,
  AuthRouterAuthenticationFailedException,
} from '@concepta/nestjs-auth-router';

// These exceptions are thrown automatically by the guard:
// - AuthRouterProviderMissingException: No provider query parameter
// - AuthRouterProviderNotSupportedException: Provider not configured
// - AuthRouterConfigNotAvailableException: Guards not properly configured
// - AuthRouterGuardInvalidException: Guard instance is invalid
// - AuthRouterAuthenticationFailedException: Authentication failed
```

## Reference

### Exported Types and Classes

- **`AuthRouterModule`**: Main module class with `forRoot()` and
  `forRootAsync()` methods
- **`AuthRouterGuard`**: Main guard that routes requests to
  provider-specific guards
- **`AuthRouterGuardsRecord`**: Type for mapping provider names to guard
  instances
- **`AuthRouterException`**: Base exception class for Auth Router
  related errors

### Configuration Options

```ts
interface AuthRouterOptions {
  guards: AuthRouterGuardConfigInterface[];
  settings?: AuthRouterSettingsInterface;
}

interface AuthRouterGuardConfigInterface {
  name: string;           // Provider name (e.g., 'google', 'facebook')
  guard: Type<CanActivate>; // Guard class that implements CanActivate
}

interface AuthRouterOptionsExtrasInterface {
  global?: boolean;       // Whether the module should be global
}
```

### Usage Patterns

**URL Patterns:**

- `/auth/login?provider=google` → Routes to Google guard
- `/auth/login?provider=facebook` → Routes to Facebook guard
- `/auth/login?provider=github` → Routes to GitHub guard

**Callback Handling:**

The guard also handles callback scenarios where the `code` parameter is present:

- `/auth/callback?provider=google&code=abc123` → Routes to Google guard with
  callback
- `/auth/callback?code=abc123&state={"provider":"google"}` → Extracts
  provider from state

## Explanation

### Overview of the Guard Router

The Auth Router module provides a routing mechanism for authentication
rather than implementing authentication strategies directly. It acts as a
dispatcher that:

1. Extracts the `provider` query parameter from incoming requests
2. Validates the provider and configuration
3. Routes the request to the appropriate provider-specific guard
4. Handles the response from the provider guard

### Provider-Based Routing

The routing system works as follows:

1. **Request Processing**: When a request hits an endpoint protected by
   `AuthRouterGuard`, the guard extracts the `provider` query parameter.

2. **Callback Detection**: If a `code` parameter is present, the guard
   handles callback scenarios:
   - Uses the `provider` from query parameters
   - Falls back to extracting provider from `state` parameter if needed

3. **Provider Validation**: The guard validates that:
   - The provider parameter is present and not empty
   - The provider is configured in the `guards` array
   - The corresponding guard instance is valid

4. **Guard Delegation**: The request is forwarded to the provider-specific
   guard's `canActivate` method.

5. **Response Handling**: The guard handles different return types:
   - `boolean`: Direct return
   - `Promise<boolean>`: Awaited
   - `Observable<boolean>`: Converted to Promise and awaited

### Error Handling System

The module includes comprehensive error handling:

- **`AuthRouterProviderMissingException`**: Thrown when no `provider`
  query parameter is provided
- **`AuthRouterProviderNotSupportedException`**: Thrown when the provider
  is not configured
- **`AuthRouterConfigNotAvailableException`**: Thrown when the guards
  configuration is invalid
- **`AuthRouterGuardInvalidException`**: Thrown when a guard instance
  doesn't implement `canActivate`
- **`AuthRouterAuthenticationFailedException`**: Thrown when the provider
  guard throws an unexpected error

This approach ensures that authentication errors are properly categorized and
can be handled appropriately by your application's error handling middleware.
