# Rockets NestJS Local Authentication

Authenticate requests using username/email and password against a local or
remote data source.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-auth-local)](https://www.npmjs.com/package/@concepta/nestjs-auth-local)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-auth-local)](https://www.npmjs.com/package/@concepta/nestjs-auth-local)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Tutorials](#tutorials)
  - [1. Getting Started with AuthLocalModule](#1-getting-started-with-authlocalmodule)
    - [1.1 Introduction](#11-introduction)
      - [Overview of the Library](#overview-of-the-library)
      - [Purpose and Key Features](#purpose-and-key-features)
    - [1.2 Installation](#12-installation)
      - [Install the AuthLocalModule package](#install-the-authlocalmodule-package)
      - [Add the AuthLocalModule to Your NestJS Application](#add-the-authlocalmodule-to-your-nestjs-application)
    - [1.3 Basic Setup in a NestJS Project](#13-basic-setup-in-a-nestjs-project)
      - [Scenario: Users can log in using local authentication](#scenario-users-can-log-in-using-local-authentication)
        - [Step 1: Create Entities](#step-1-create-entities)
        - [Step 2: Create Services](#step-2-create-services)
        - [Step 3: Configure the Module](#step-3-configure-the-module)
        - [Validating the Setup](#validating-the-setup)
- [How-To Guides](#how-to-guides)
  - [1. Registering AuthLocalModule Synchronously](#1-registering-authlocalmodule-synchronously)
  - [2. Registering AuthLocalModule Asynchronously](#2-registering-authlocalmodule-asynchronously)
  - [3. Global Registering AuthLocalModule Asynchronously](#3-global-registering-authlocalmodule-asynchronously)
  - [4. Implementing User Model Service](#4-implementing-user-model-service)
  - [5. Implementing custom token issuance service](#5-implementing-custom-token-issuance-service)
  - [6. Implementing a custom user validation service](#6-implementing-a-custom-user-validation-service)
  - [7. Implementing a custom password validation service](#7-implementing-a-custom-password-validation-service)
  - [8. Overriding the Settings](#8-overriding-the-settings)
  - [9. Integration with Other NestJS Modules](#9-integration-with-other-nestjs-modules)
- [Reference](#reference)
- [Explanation](#explanation)
  - [Conceptual Overview of Local Authentication](#conceptual-overview-of-local-authentication)
    - [What is Local Authentication?](#what-is-local-authentication)
    - [Benefits of Using Local Authentication](#benefits-of-using-local-authentication)
  - [Design Choices in AuthLocalModule](#design-choices-in-authlocalmodule)
    - [Why Use Local Authentication?](#why-use-local-authentication)
    - [Synchronous vs Asynchronous Registration](#synchronous-vs-asynchronous-registration)
    - [Global vs Feature-Specific Registration](#global-vs-feature-specific-registration)

## Tutorials

### 1. Getting Started with AuthLocalModule

#### 1.1 Introduction

##### Overview of the Library

The `AuthLocalModule` is a robust NestJS module designed for implementing
local authentication using username and password. This module leverages the
[`passport-local`](https://www.passportjs.org/packages/passport-local) strategy
to authenticate users locally within your application.

##### Purpose and Key Features

- **Local Authentication**: Provides a straightforward way to implement local
authentication using username and password.

- **Synchronous and Asynchronous Registration**: Flexibly register the module
either synchronously or asynchronously, depending on your application's needs.

- **Global and Feature-Specific Registration**: Use the module globally across
your application or tailor it for specific features.

- **Customizable**: Easily customize various aspects such as user validation,
token issuance, and password validation.

#### 1.2 Installation

##### Install the AuthLocalModule package

```sh
npm install class-transformer
npm install class-validator
npm install @concepta/nestjs-common
npm install @concepta/nestjs-authentication
npm install @concepta/nestjs-password
npm install @concepta/nestjs-jwt
npm install @concepta/nestjs-auth-local

or

yarn add class-transformer
yarn add class-validator
yarn add @concepta/nestjs-common
yarn add @concepta/nestjs-authentication
yarn add @concepta/nestjs-password
yarn add @concepta/nestjs-jwt
yarn add @concepta/nestjs-auth-local

```

##### Add the AuthLocalModule to Your NestJS Application

Import the `AuthLocalModule` and required services in your application module.
Ensure to provide the necessary configuration options at
`AuthLocalOptionsInterface`.

The `AuthLocalOptionsInterface` defines the configuration options for the
local authentication strategy within a NestJS application using the
`@concepta/nestjs-auth-local` package. This interface allows for the customization
of `userModelService`, `issueTokenService`, `validateUserService`, and
`passwordValidationService`. Please see [Reference](#reference) for more
details.

Optional fields utilize default implementations, enabling straightforward
integration and flexibility to override with custom implementations as needed.
This setup ensures that developers can tailor the authentication process to
specific requirements while maintaining a robust and secure authentication
framework.

#### 1.3 Basic Setup in a NestJS Project

##### Scenario: Users can log in using local authentication

To test this scenario, we will set up an application where users can log
in using a username and password. We will create the necessary entities,
services, module configurations.

> Note: The `@concepta/nestjs-user` module can be used in place of our
> example `User` related prerequisites.

## Step 1: Create Entities

First, create the `User` entity.

```ts
// user.entity.ts
export class User {
  id: number;
  username: string;
  password: string;
}
```

## Step 2: Create Services

Next, you need to create the `UserModelService`. This
service is responsible for the business logic related to
retrieving user data. It should implement the
`AuthLocalUserModelServiceInterface`.

Within this service, implement the `byUsername` method to
fetch user details by their username (or email). Ensure that
the method  returns a `User` object containing `passwordHash` and
`passwordSalt`.

These attributes are crucial as they are used by the
`validateUser` method in the `passwordValidationService`
to authenticate the user, which is a configurable option
in the `AuthLocalModule`.

```ts
// user-model.service.ts
import { Injectable } from '@nestjs/common';
import { ReferenceUsername } from '@concepta/nestjs-common';
import { AuthLocalUserModelServiceInterface } from '@concepta/nestjs-auth-local';
import { AuthLocalCredentialsInterface } from '@concepta/nestjs-auth-local/dist/interfaces/auth-local-credentials.interface';

@Injectable()
export class UserModelService implements AuthLocalUserModelServiceInterface {
  async byUsername(
    username: ReferenceUsername,
  ): Promise<AuthLocalCredentialsInterface | null> {
    // make sure this method will return a valid user with
    // correct passwordHash and passwordSalt
    // let's user this mock data for the purposes of this tutorial
    return {
      id: '5b3f5fd3-9426-4c4d-a06d-b4d55079034d',
      username: username,
      passwordHash:
        '$2b$12$9rQ4qZx8gpTaTR4ic3LQ.OkebyVBa48DP42jErL1zfqF17WeG4hHC',
      passwordSalt: '$2b$12$9rQ4qZx8gpTaTR4ic3LQ.O',
      active: true,
    };
  }
}
```

## Step 3: Configure the Module

Configure the module to include the necessary services `userModelService`.

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthLocalModule } from '@concepta/nestjs-auth-local';
import { JwtModule } from '@concepta/nestjs-jwt';
import { UserModelService } from './user-model.service';

@Module({
  imports: [
    JwtModule.forRoot({}),
    AuthLocalModule.forRoot({
      userModelService: new UserModelService(),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

## Validating the Setup

To validate the setup, you can use `curl` commands to simulate frontend
requests. Here are the  steps to test the login endpoint:

### Step 1: Obtain a JWT Token

Assuming you have an endpoint to obtain a JWT token, use `curl` to get
the token. Replace `auth-url` with your actual authentication URL, and
`username` and `password` with valid credentials.

```sh
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpassword"}'
```

This should return a response with a login message.

### Example

Here is an example sequence of `curl` commands to validate the login setup:

1. **Login Request:**

Command:

```sh
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "username", "password": "Test1234"}'
```

Response (example):

```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NjZkMTAyNS1iZGNkLTRiNWItYTYxMi0yYThiZTU2MDhlNjIiLCJpYXQiOjE3MTgwNDg1NDQsImV4cCI6MTcxODA1MjE0NH0.Zl2i59w89cgJxfI4lXn6VmOhC5GLEqMm2nWkiVKpEUs",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NjZkMTAyNS1iZGNkLTRiNWItYTYxMi0yYThiZTU2MDhlNjIiLCJpYXQiOjE3MTgwNDg1NDQsImV4cCI6NDg0MjI1MDk0NH0.xEF7kObwkztrMF7J83S-xvDarABmjXYkqLFINPWbx6g"
}
```

1. **Invalid Credentials Request:**

Command:

```sh
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "wrongpassword"}'
```

Response (example):

```json
{
    "statusCode": 401,
    "message": "Unauthorized"
}
```

## How-To Guides

### 1. Registering AuthLocalModule Synchronously

```ts
// app.module.ts

//...
  AuthLocalModule.register({
    userModelService: new MyUserModelService(), // required
  }),
//...
```

### 2. Registering AuthLocalModule Asynchronously

```ts
// app.module.ts
import { MyUserModelService } from './services/my-user-model.service.ts';

//...
AuthLocalModule.registerAsync({
  useFactory: async (userModelService: MyUserModelService) => ({
    userModelService, // required
  }),
  inject: [MyUserModelService],
}),
//...
```

### 3. Global Registering AuthLocalModule Asynchronously

```ts
// app.module.ts

//...
AuthLocalModule.forRootAsync({
  useFactory: async (userModelService: MyUserModelService) => ({
    userModelService, 
  }),
  inject: [MyUserModelService],
}),
//...
```

### 4. Implementing User Model Service

```ts
// my-user-model.service.ts
import { Injectable } from '@nestjs/common';
import {
  AuthLocalUserModelServiceInterface,
  AuthLocalCredentialsInterface
} from '@concepta/nestjs-auth-local';

@Injectable()
export class MyUserModelService
  implements AuthLocalUserModelServiceInterface {
  async byUsername(username: string): Promise<AuthLocalCredentialsInterface | null> {
    // implement custom logic to return the user's credentials
    return null;
  }
}
```

### 5. Implementing custom token issuance service

There are two ways to implementing the custom token issue service. You can
take advantage of the default service, as seen here:

```ts
// my-jwt-issue.service.ts
import { Injectable } from '@nestjs/common';
import {
  JwtIssueService,
  JwtIssueServiceInterface,
  JwtSignService,
} from '@concepta/nestjs-jwt';

@Injectable()
export class MyJwtIssueService extends JwtIssueService {
  constructor(protected readonly jwtSignService: JwtSignService) {
    super(jwtSignService);
  }

  async accessToken(
    ...args: Parameters<JwtIssueServiceInterface['accessToken']>
  ) {
    // your custom code
    return super.accessToken(...args);
  }

  async refreshToken(
    ...args: Parameters<JwtIssueServiceInterface['refreshToken']>
  ) {
    // your custom code
    return super.refreshToken(...args);
  }
}
```

Or you can completely replace the default implementation:

```ts
// my-jwt-issue.service.ts
import { Injectable } from '@nestjs/common';
import { JwtIssueServiceInterface } from '@concepta/nestjs-jwt';

@Injectable()
export class MyJwtIssueService implements JwtIssueServiceInterface {
  constructor() {}

  async accessToken(
    ...args: Parameters<JwtIssueServiceInterface['accessToken']>
  ) {
    // your custom code
  }

  async refreshToken(
    ...args: Parameters<JwtIssueServiceInterface['refreshToken']>
  ) {
    // your custom code
  }
}
```

### 6. Implementing a custom user validation service

The same approach can be done for `AuthLocalValidateUserService` you can
either completely override the default implementation or you can take
advantage of the default implementation.

```ts
// my-auth-local-validate-user.service.ts
import { Injectable } from '@nestjs/common';
import { ReferenceActiveInterface, ReferenceIdInterface } from '@concepta/nestjs-common';
import {
  AuthLocalValidateUserInterface,
  AuthLocalValidateUserService
} from '@concepta/nestjs-auth-local';

@Injectable()
export class MyAuthLocalValidateUserService
  extends AuthLocalValidateUserService
{
  
  async validateUser(
    dto: AuthLocalValidateUserInterface,
  ): Promise<ReferenceIdInterface> {
    // customize as needed
    return super.validateUser(dto);
  }

  async isActive(
    user: ReferenceIdInterface<string> & ReferenceActiveInterface<boolean>,
  ): Promise<boolean> {
    // customize as needed
    return super.isActive(user);
  }
}
```

```ts
// my-auth-local-validate-user.service.ts
import { Injectable } from '@nestjs/common';
import { ReferenceActiveInterface, ReferenceIdInterface } from '@concepta/nestjs-common';
import {
  AuthLocalValidateUserInterface,
  AuthLocalValidateUserServiceInterface
} from '@concepta/nestjs-auth-local';

@Injectable()
export class MyAuthLocalValidateUserService
  implements AuthLocalValidateUserServiceInterface
{
  async validateUser(
    dto: AuthLocalValidateUserInterface,
  ): Promise<ReferenceIdInterface> {
    // your custom code
    return {
      id: '[userId]',
      //...
    }
  }

  async isActive(
    user: ReferenceIdInterface<string> & ReferenceActiveInterface<boolean>,
  ): Promise<boolean> {
    // customize as needed
    return true;
  }
}
```

### 7. Implementing a custom password validation service

The `PasswordValidationService` in the `@concepta/nestjs-password` module
provides a default implementation using bcrypt for hashing and verifying passwords.
However, depending on your application's requirements, you might need to use a
different method for password hashing or add additional validation logic.

You can either extend the existing `PasswordValidationService` to leverage its
built-in functionalities while adding your enhancements, or completely
override it with your custom implementation.

**Overriding the Default Implementation:**

If your application requires a different hashing algorithm , you can replace
the default implementation with one that suits your needs.

```ts
// my-password-validation.service.ts
import { Injectable } from '@nestjs/common';
import {
  PasswordStorageInterface,
  PasswordValidationServiceInterface,
} from '@concepta/nestjs-password';

@Injectable()
export class MyPasswordValidationService
  implements PasswordValidationServiceInterface
{
  async validate(options: {
    password: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<boolean> {
    // customize as needed
    return true;
  }

  async validateObject<T extends PasswordStorageInterface>(
    password: string,
    object: T,
  ): Promise<boolean> {
    // customize as needed
    return true;
  }
}
```

**Extending the Default Service:**

If you want to add additional validation logic while keeping the current
hashing and validation, you can extend the default service:

```ts
// my-password-validation.service.ts
import {
  PasswordStorageInterface,
  PasswordValidationService,
} from '@concepta/nestjs-password';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyPasswordValidationService extends PasswordValidationService {
  async validate(options: {
    password: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<boolean> {
    // customize as neeeded
    return super.validate(options);
  }

  async validateObject<T extends PasswordStorageInterface>(
    password: string,
    object: T,
  ): Promise<boolean> {
    // customize as neeeded
    return super.validateObject(password, object);
  }
}
```

### 8. Overriding the Settings

```ts
import { Type } from '@nestjs/common';

export class CustomLoginDto {
  email: string;
  password: string;
}

export const localSettings = {
  loginDto: CustomLoginDto,
  usernameField: 'email',
  passwordField: 'password'
};
```

```ts
AuthLocalModule.forRoot({
  userModelService: new UserModelService(),
  issueTokenService: new MyIssueTokenService(), // <- optional
  passwordValidationService: new PasswordValidationService(), // <- optional
  settings: localSettings
}),
```

### 9. Integration with Other NestJS Modules

Integrate `nestjs-auth-local` with other NestJS modules like,
`@concepta/nestjs-authentication`, `@concepta/nestjs-auth-jwt`,
`@concepta/nestjs-auth-refresh` for a comprehensive authentication system.

## Reference

For detailed information on the properties, methods, and classes used in
the `@concepta/nestjs-auth-local`, please refer to the API documentation
available at
[AuthLocalModule API Documentation](https://www.rockets.tools/reference/rockets/nestjs-auth-local/README).
This documentation provides comprehensive details on the interfaces and
services that you can utilize to customize and extend the authentication
functionality within your NestJS application.

## Explanation

### Conceptual Overview of Local Authentication

#### What is Local Authentication?

Local Authentication is a method of verifying user identity based on credentials
(username and password) stored locally within the application or in a connected
database.

#### Benefits of Using Local Authentication

- **Simplicity**: Easy to implement and manage.
- **Control**: Full control over user authentication and data.
- **Security**: When properly implemented, provides a secure way to authenticate
 users.

### Design Choices in AuthLocalModule

#### Why Use Local Authentication?

Local Authentication is ideal for applications that need to manage user
authentication directly within the application without relying on external
identity providers.

#### Synchronous vs Asynchronous Registration

- **Synchronous Registration**: Used when configuration options are static and
available at startup.

- **Asynchronous Registration**: Used when configuration options need to be
retrieved from external sources at runtime.

#### Global vs Feature-Specific Registration

- **Global Registration**: Makes the module available throughout the entire
application.

- **Feature-Specific Registration**: Allows the module to be registered only
for specific features or modules within the application.
