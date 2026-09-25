# Rockets NestJS Refresh Authentication

Authenticate requests using JWT refresh tokens passed via
the request (headers, cookies, body, query, etc).

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-auth-refresh)](https://www.npmjs.com/package/@concepta/nestjs-auth-refresh)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-auth-refresh)](https://www.npmjs.com/package/@concepta/nestjs-auth-refresh)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Tutorials](#tutorials)
  - [1. Getting Started with AuthRefreshModule](#1-getting-started-with-authrefreshmodule)
    - [1.1 Introduction](#11-introduction)
      - [Overview of the Library](#overview-of-the-library)
      - [Purpose and Key Features](#purpose-and-key-features)
    - [1.2 Installation](#12-installation)
      - [Install the AuthRefreshModule package](#install-the-authrefreshmodule-package)
      - [Add the AuthRefreshModule to Your NestJS Application](#add-the-authrefreshmodule-to-your-nestjs-application)
    - [1.3 Basic Setup in a NestJS Project](#13-basic-setup-in-a-nestjs-project)
      - [Scenario: Refreshing JWT Tokens](#scenario-refreshing-jwt-tokens)
      - [Adding AuthRefreshModule to your NestJS Application](#adding-authrefreshmodule-to-your-nestjs-application)
    - [1.4 First Token Refresh](#14-first-token-refresh)
      - [Validating the Setup](#validating-the-setup)
      - [Step 1: Obtain a Refresh Token](#step-1-obtain-a-refresh-token)
      - [Step 2: Refresh the JWT Token](#step-2-refresh-the-jwt-token)
      - [Example CURL Calls](#example-curl-calls)
        - [Obtain a Refresh Token](#obtain-a-refresh-token)
        - [Example Refresh Token Response](#example-refresh-token-response)
        - [Refresh the JWT Token](#refresh-the-jwt-token)
- [How-To Guides](#how-to-guides)
  - [1. Registering AuthRefreshModule Synchronously](#1-registering-authrefreshmodule-synchronously)
  - [2. Registering AuthRefreshModule Asynchronously](#2-registering-authrefreshmodule-asynchronously)
  - [3. Global Registering AuthRefreshModule Asynchronously](#3-global-registering-authrefreshmodule-asynchronously)
  - [4. Using Custom User Model Service](#4-using-custom-user-model-service)
  - [5. Implementing and Using Custom Token Verification Service](#5-implementing-and-using-custom-token-verification-service)
  - [6. Overwriting the Settings](#6-overwriting-the-settings)
  - [7. Integration with Other NestJS Modules](#7-integration-with-other-nestjs-modules)
- [Engineering Concepts](#engineering-concepts)
  - [Conceptual Overview of JWT Refresh Tokens](#conceptual-overview-of-jwt-refresh-tokens)
    - [What is a Refresh Token?](#what-is-a-refresh-token)
    - [Benefits of Using Refresh Tokens](#benefits-of-using-refresh-tokens)
  - [Design Choices in AuthRefreshModule](#design-choices-in-authrefreshmodule)
    - [Why Use NestJS Guards?](#why-use-nestjs-guards)
    - [Synchronous vs Asynchronous Registration](#synchronous-vs-asynchronous-registration)
    - [Global vs Feature-Specific Registration](#global-vs-feature-specific-registration)
  - [Integrating AuthRefreshModule with Other Modules](#integrating-authrefreshmodule-with-other-modules)
    - [How AuthRefreshModule Works with AuthJwtModule](#how-authrefreshmodule-works-with-authjwtmodule)
    - [Integrating with AuthLocalModule](#integrating-with-authlocalmodule)

## Tutorials

### 1. Getting Started with AuthRefreshModule

#### 1.1 Introduction

##### Overview of the Library

The `AuthRefreshModule` is a powerful yet easy-to-use NestJS
module designed for implementing JWT refresh token functionality.
With a few simple steps, you can integrate secure token refreshing
into your application without hassle.

##### Purpose and Key Features

- **Ease of Use**: The primary goal of `AuthRefreshModule` is to
simplify the process of adding JWT refresh token functionality to your
NestJS application. All you need to do is provide configuration data, and
the module handles the rest.
- **Synchronous and Asynchronous Registration**: Flexibly register the module
either synchronously or asynchronously, depending on your application's needs.
- **Global and Feature-Specific Registration**: Register the module globally or
for specific features within your application, allowing for more granular
control over authentication and authorization requirements.

#### 1.2 Installation

##### Install the AuthRefreshModule package

To install the `AuthRefreshModule` package, run the following command in
your terminal:

```bash
npm install @concepta/nestjs-auth-refresh
```

##### Add the AuthRefreshModule to Your NestJS Application

To add the `AuthRefreshModule` to your NestJS application, import the module in
your main application module (usually `app.module.ts`) and register it using the
`forRoot` or `forRootAsync` method:

```typescript
import { AuthRefreshModule } from '@concepta/nestjs-auth-refresh';

@Module({
  imports: [
    AuthRefreshModule.forRoot({
      // Configuration options
    }),
  ],
})
export class AppModule {}
```

#### 1.3 Basic Setup in a NestJS Project

##### Scenario: Refreshing JWT Tokens

To demonstrate the basic setup of the `AuthRefreshModule`, let's consider
a scenario where we want to refresh JWT tokens. In this example, we will use
`@concepta/nestjs-auth-refresh` in conjunction with other essential modules
such as `@concepta/nestjs-auth-jwt`, `@concepta/nestjs-auth-local`, and
`@concepta/nestjs-authentication`. These modules work together to provide a
comprehensive and secure token refresh mechanism.

For more detailed instructions on setting up the authentication modules,
please refer to the [Authentication Module Documentation](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-authentication).
We will continue with the tutorial in the [Authentication Module Documentation](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-authentication).

###### Adding AuthRefreshModule to your NestJS Application

To add the `AuthRefreshModule` to your NestJS application, import the module
in your main application module (usually `app.module.ts`) and register it
using the `forRoot` or `forRootAsync` method, let's use the
`MyJwtUserModelService` created at
[Authentication Module Documentation](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-authentication):

```ts
//...
AuthRefreshModule.forRoot({
  userModelService: new MyJwtUserModelService()
}),
//... 
```

> Additionally, you can take advantage of the `MyUserModelService`
> from the `@concepta/nestjs-user` module to streamline user model
> operations within your authentication flow, check
> [User Module Documentation](https://www.rockets.tools/reference/rockets/nestjs-user/README)
> for reference:

By default, `AuthRefreshModule` uses services defined in the
[AuthenticationModule](https://www.rockets.tools/reference/rockets/nestjs-authentication/README)
to verify refresh tokens. However, you can override this behavior by
providing a custom service specifically for the
refresh token implementation during the module setup.

#### 1.4 First Token Refresh

##### Validating the Setup

To validate the setup, let's test the refresh token functionality using CURL commands.

##### Step 1: Obtain a Refresh Token

First, obtain a refresh token by sending a request to the `/auth/login`
endpoint with valid credentials:

```bash
curl -X POST \
  http://localhost:3000/auth/login\
  -H 'Content-Type: application/json' \
  -d '{"username":"user@example.com","password":"password"}'
```

This should return a response with an access token and a refresh token.

##### Step 2: Refresh the JWT Token

Next, use the obtained refresh token to refresh the JWT token:

```bash
curl -X POST \
  http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"[refresh_token_value]"}'
```

This should return a new access token and a new refresh token.

##### Example CURL Calls

###### Obtain a Refresh Token

```bash
curl -X POST \
  http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"user@example.com","password":"password"}'
```

###### Example Refresh Token Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cC...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cC..."
}
```

###### Refresh the JWT Token

```bash
curl -X POST \
  http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cC..."}'
```

###### Response (example)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cC...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cC..."
}
```

## How-To Guides

### 1. Registering AuthRefreshModule Synchronously

```ts
//...
AuthRefreshModule.register({
  userModelService: new MyUserModelService(),
  issueTokenService: new MyIssueTokenService(),
}),
//...
```

### 2. Registering AuthRefreshModule Asynchronously

```ts
//...
AuthRefreshModule.registerAsync({
  inject: [MyUserModelService, MyIssueTokenService],
  useFactory: async (
    userModelService: MyUserModelService,
    issueTokenService: MyIssueTokenService
  ) => ({
    userModelService,
    issueTokenService,
  }),
}),
//...
```

### 3. Global Registering AuthRefreshModule Asynchronously

```ts
//...
AuthRefreshModule.forRootAsync({
  inject: [MyUserModelService, MyIssueTokenService],
  useFactory: async (
    userModelService: MyUserModelService,
    issueTokenService: MyIssueTokenService
  ) => ({
    userModelService,
    issueTokenService,
  }),
}),
//...
```

### 4. Using Custom User Model Service

```ts
//...
@Injectable()
export class MyUserModelService extends AuthRefreshUserModelServiceInterface {
  constructor(private userService: UserService) {}

  async bySubject(subject: ReferenceSubject): Promise<ReferenceIdInterface> {
    // return authorized user
    return this.userService.findOne(subject);
  }
}
//...
```

### 5. Implementing and Using Custom Token Verification Service

By default, `AuthRefreshModule` uses services defined in the
[AuthenticationModule](https://www.rockets.tools/reference/rockets/nestjs-authentication/README)
to verify refresh tokens. However, you can override this behavior by providing
a custom service specifically for the refresh token implementation during
the module setup.

For more details on implementing a custom token verification service, refer to
section 5 of the How-To Guide in the
[@concepta/nestjs-auth-jwt](https://www.rockets.tools/reference/rockets/nestjs-auth-jwt/README)
documentation.

### 6. Overwriting the Settings

```ts
  // app.module.ts
import { Module } from '@nestjs/common';
import { ExtractJwt } from '@concepta/nestjs-jwt';
import { AuthRefreshModule, AuthRefreshSettingsInterface } from '@concepta/nestjs-auth-refresh';

const settings: AuthRefreshSettingsInterface = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  verifyToken: async (token: string, done: (error: any, payload?: any) => void) => {
    try {
      const payload = { id: 'user-id' };
      done(null, payload);
    } catch (error) {
      done(error);
    }
  },
};

@Module({
  imports: [
    AuthRefreshModule.registerAsync({
      useFactory: async () => ({
        settings,
      }),
    }),
  ],
})
export class AppModule {}
```

### 7. Integration with Other NestJS Modules

Integrate `@concepta/nestjs-auth-refresh` with other NestJS modules
like `@concepta/nestjs-user`, `@concepta/nestjs-auth-local`,
`@concepta/nestjs-auth-jwt`, and more for a comprehensive
authentication system.

## Engineering Concepts

### Conceptual Overview of JWT Refresh Tokens

#### What is a Refresh Token?

A refresh token is a special token used to obtain a new access token
without requiring the user to re-authenticate. It is typically issued
alongside the access token and has a longer expiration time.

#### Benefits of Using Refresh Tokens

- **Improved Security**: By using refresh tokens, access tokens can
  have shorter lifespans, reducing the risk of token theft.
- **Enhanced User Experience**: Users do not need to log in frequently,
as refresh tokens can be used to obtain new access tokens seamlessly.
- **Scalability**: Refresh tokens allow for stateless authentication,
which is ideal for scalable applications.

### Design Choices in AuthRefreshModule

#### Why Use NestJS Guards?

NestJS guards provide a way to control access to various parts of the
application by checking certain conditions before the route handler is
executed. In `AuthRefreshModule`, guards are used to implement authentication
and authorization logic. By using guards, developers can apply security
policies across routes efficiently, ensuring that only authenticated
and authorized users can access protected resources.

#### Synchronous vs Asynchronous Registration

The `AuthRefreshModule` supports both synchronous and asynchronous
registration:

- **Synchronous Registration**: This method is used when the configuration
options are static and available at application startup. It simplifies the
setup process and is suitable for most use cases where configuration values
do not depend on external services.

- **Asynchronous Registration**: This method is beneficial when configuration
options need to be retrieved from external sources, such as a database or an
external API, at runtime. It allows for more flexible and dynamic
configuration but requires an asynchronous factory function.

#### Global vs Feature-Specific Registration

The `AuthRefreshModule` can be registered globally or for specific features:

- **Global Registration**: Makes the module available throughout the entire
application. This approach is useful when JWT refresh functionality is
required across all or most routes in the application.

- **Feature-Specific Registration**: Allows the module to be registered
only for specific features or modules within the application. This provides
more granular control, enabling different parts of the application to have
distinct authentication and authorization requirements.

### Integrating AuthRefreshModule with Other Modules

#### How AuthRefreshModule Works with AuthJwtModule

The `AuthRefreshModule` can be seamlessly integrated with the
`AuthJwtModule` to provide a comprehensive authentication solution.
`AuthJwtModule` handles the initial authentication using JWT tokens.

Once the user is authenticated, `AuthRefreshModule` can issue a refresh
token that the user can use to obtain new access tokens. This integration
allows for secure and efficient authentication processes combining the
strengths of both modules.

#### Integrating with AuthLocalModule

Integrating `AuthRefreshModule` with `AuthLocalModule` enables the
application to handle token refresh logic alongside local authentication.
This setup enhances the user experience by maintaining sessions securely and
seamlessly. The integration involves configuring both modules to use the same
token issuance and verification mechanisms, ensuring smooth interoperability
and security.
