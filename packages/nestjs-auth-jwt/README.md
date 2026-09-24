# Rockets NestJS JWT Authentication

Authenticate requests using JWT tokens passed via the
request (headers, cookies, body, query, etc).

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-auth-jwt)](https://www.npmjs.com/package/@concepta/nestjs-auth-jwt)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-auth-jwt)](https://www.npmjs.com/package/@concepta/nestjs-auth-jwt)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Tutorials](#tutorials)
  - [1. Getting Started with AuthJwtModule](#1-getting-started-with-authjwtmodule)
    - [1.1 Introduction](#11-introduction)
      - [Overview of the Library](#overview-of-the-library)
      - [Purpose and Key Features](#purpose-and-key-features)
    - [1.2 Installation](#12-installation)
      - [Install the AuthJwtModule package](#install-the-authjwtmodule-package)
      - [Add the AuthJwtModule to Your NestJS Application](#add-the-authjwtmodule-to-your-nestjs-application)
    - [1.3 Basic Setup in a NestJS Project](#13-basic-setup-in-a-nestjs-project)
      - [Scenario: Users have a list of pets](#scenario-users-have-a-list-of-pets)
        - [Step 1: Create Entities](#step-1-create-entities)
        - [Step 2: Create Services](#step-2-create-services)
        - [Step 3: Create Controller](#step-3-create-controller)
        - [Step 4: Configure the Module](#step-4-configure-the-module)
    - [1.4 First Authentication with JWT](#14-first-authentication-with-jwt)
      - [Validating the Setup](#validating-the-setup)
      - [Step 1: Obtain a JWT Token](#step-1-obtain-a-jwt-token)
      - [Step 2: Make an Authenticated Request](#step-2-make-an-authenticated-request)
      - [Example CURL Calls](#example-curl-calls)
        - [Obtain a JWT token](#obtain-a-jwt-token)
        - [Example JWT response](#example-jwt-response)
        - [Make an authenticated request using the token](#make-an-authenticated-request-using-the-token)
        - [Example authenticated response](#example-authenticated-response)
- [How-To Guides](#how-to-guides)
  - [Setting Up a custom Module for Providers](#setting-up-a-custom-module-for-providers)
  - [1. Registering AuthJwtModule Synchronously](#1-registering-authjwtmodule-synchronously)
  - [2. Registering AuthJwtModule Asynchronously](#2-registering-authjwtmodule-asynchronously)
  - [3. Global Registering AuthJwtModule Asynchronously](#3-global-registering-authjwtmodule-asynchronously)
  - [4. Using Custom User Model Service](#4-using-custom-user-model-service)
  - [5. Implementing and Using Custom Token Verification Service](#5-implementing-and-using-custom-token-verification-service)
  - [6. Setting Up a Custom Guard](#6-setting-up-a-custom-guard)
    - [Step 1: Implement the Custom Guard](#step-1-implement-the-custom-guard)
    - [Step 2: Provide the Custom Guard in Module Configuration](#step-2-provide-the-custom-guard-in-module-configuration)
  - [7. Disabling the Guard](#7-disabling-the-guard)
    - [Disable the Guard in Module Configuration](#disable-the-guard-in-module-configuration)
  - [8. Overwriting the Settings](#8-overwriting-the-settings)
  - [9. Integration with Other NestJS Modules](#9-integration-with-other-nestjs-modules)
- [Reference](#reference)
  - [1. AuthJwtModule API Reference](#1-authjwtmodule-api-reference)
  - [2. AuthJwtOptionsInterface](#2-authjwtoptionsinterface)
  - [3. AuthJwtModule Classes and Interfaces](#3-authjwtmodule-classes-and-interfaces)
- [Engineering Concepts](#engineering-concepts)
  - [Conceptual Overview of JWT Authentication](#conceptual-overview-of-jwt-authentication)
    - [What is JWT?](#what-is-jwt)
    - [Benefits of Using JWT](#benefits-of-using-jwt)
  - [Design Choices in AuthJwtModule](#design-choices-in-authjwtmodule)
    - [Why Use NestJS Guards?](#why-use-nestjs-guards)
    - [Synchronous vs Asynchronous Registration](#synchronous-vs-asynchronous-registration)
    - [Global vs Feature-Specific Registration](#global-vs-feature-specific-registration)
  - [Integrating AuthJwtModule with Other Modules](#integrating-authjwtmodule-with-other-modules)
    - [How AuthJwtModule Works with AuthLocalModule](#how-authjwtmodule-works-with-authlocalmodule)
    - [Integrating with AuthRefreshModule](#integrating-with-authrefreshmodule)

## Tutorials

### 1. Getting Started with AuthJwtModule

### 1.1 Introduction

#### Overview of the Library

The `AuthJwtModule` is a powerful yet easy-to-use NestJS module designed for
implementing JWT-based authentication. With a few simple steps, you can integrate
secure authentication into your application without hassle.

#### Purpose and Key Features

- **Ease of Use**: The primary goal of `AuthJwtModule` is to simplify the process
of adding JWT authentication to your NestJS application. All you need to do is provide
configuration data, and the module handles the rest.

- **Protect By Default**: Be default the `AuthJwtModule` provides a global `APP_GUARD`
to protect all routes by default. This can easily be overridden using the
`@AuthPublic` decorator.

- **Synchronous and Asynchronous Registration**: Flexibly register the module either
synchronously or asynchronously, depending on your application's needs.

- **Global and Feature-Specific Registration**: Use the module globally across your
application or tailor it for specific features.

- **Seamless Integration**: Easily integrates with other NestJS modules like
`@concepta/nestjs-auth-local`, `@concepta/nestjs-auth-refresh`, and more.

### 1.2 Installation

#### Install the AuthJwtModule package

To get started, install the `@concepta/nestjs-auth-jwt` packages and some other
dependencies from npm or yarn:

```bash
npm install class-transformer
npm install class-validator
npm install @nestjs/jwt
npm install @concepta/nestjs-common
npm install @concepta/nestjs-authentication
npm install @concepta/nestjs-jwt
npm install @concepta/nestjs-auth-jwt
```

or

```bash
yarn add class-transformer
yarn add class-validator
yarn add @nestjs/jwt
yarn add @concepta/nestjs-common
yarn add @concepta/nestjs-authentication
yarn add @concepta/nestjs-jwt
yarn add @concepta/nestjs-auth-jwt
```

#### Add the AuthJwtModule to Your NestJS Application

Import the `AuthJwtModule` and required services in your application module.
Ensure to import `JwtModule` and provide the necessary configuration options,
including the required `userModelService`.

### 1.3 Basic Setup in a NestJS Project

#### Scenario: Users have a list of pets

To demonstrate this scenario, we will set up an application where users can
have a list of pets. We will create the necessary entities, services, module
configurations to simulate the environment.

> Note: The `@concepta/nestjs-user` module can be used in place of our
> example `User` related prerequisites.

#### Step 1: Create Entities

First, create the `User` and `Pet` entities.

```ts
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pet } from './pet.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => Pet, pet => pet.user)
  pets: Pet[];
}
```

```ts
// pet.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User, user => user.pets)
  user: User;
}
```

#### Step 2: Create Services

Next, create services for `User` and `Pet` to handle the business logic.

```ts
// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['pets'] });
  }

  findOne(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['pets'],
    });
  }
}
```

```ts
// user-model.service.ts
import { AuthJwtUserModelServiceInterface } from '@concepta/nestjs-auth-jwt';
import { ReferenceIdInterface, ReferenceSubject } from '@concepta/nestjs-common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class UserModelService implements AuthJwtUserModelServiceInterface {
   constructor(
    private userService: UserService,
  ) {}
  async bySubject(subject: ReferenceSubject): Promise<ReferenceIdInterface> {
    // return authorized user
    return this.userService.findOne(subject);
  }
}
```

```ts
// pet.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './pet.entity';

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
  ) {}

  findAll(): Promise<Pet[]> {
    return this.petRepository.find();
  }

  findByUserId(userId: number): Promise<Pet[]> {
    return this.petRepository.find({ where: { user: { id: userId } } });
  }
}
```

#### Step 3: Create Controller

Create a controller to handle the HTTP requests.

> Use `@AuthPublic` decorator from `@concepta/nestjs-authentication`
on the controller or individual routes if you want to override the
global JWT guard to make the route public.

```ts
// user.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { PetService } from './pet.service';
import { AuthJwtGuard } from '@concepta/nestjs-auth-jwt';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private petService: PetService,
  ) {}

  @Get(':id/pets')
  async getPets(@Param('id') userId: number) {
    return this.petService.findByUserId(userId);
  }
}
```

#### Step 4: Configure the Module

Configure the module to include the necessary services, controllers, and guards.

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PetService } from './pet.service';
import { User } from './user.entity';
import { Pet } from './pet.entity';
import { JwtModule, ExtractJwt } from '@concepta/nestjs-jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Pet]),
    JwtModule.forRoot({}), // <- required for AuthJwtModule to work
    AuthJwtModule.registerAsync({
      inject: [UserService],
      useFactory: async (userModelService: UserService) => ({
        userModelService,        
      }),
    }),
  ],
  controllers: [UserController],
  providers: [UserService, PetService],
});

export class UserModule {};
```

### 1.4 First Authentication with JWT

#### Validating the Setup

To validate the setup, you can use `curl` commands to simulate
frontend requests.

By following these steps, you can validate that the setup is
working correctly and that authenticated requests to the `user/:id/pets`
endpoint return the expected list of pets for a given user.

Here are the steps to test the `user/:id/pets` endpoint:

#### Step 1: Obtain a JWT Token

Assuming you have an authentication endpoint to obtain a JWT token,
use `curl` to get the token. Replace `[auth-url]` with your actual
authentication URL, and `[username]` and `[password]` with valid credentials.

```bash
curl -X POST [auth-url] \
  -H "Content-Type: application/json" \
  -d '{"username": "[username]", "password": "[password]"}'
```

This should return a response with a JWT token, which you'll use for
authenticated requests.

#### Step 2: Make an Authenticated Request

Use the JWT token obtained in the previous step to make an authenticated
request to the `user/:id/pets` endpoint. Replace `[jwt-token]` with the actual
token and `[user-id]` with a valid user ID.

```bash
curl -X GET http://localhost:3000/user/[user-id]/pets \
  -H "Authorization: Bearer [jwt-token]"
```

#### Example Curl Calls

Here is an example sequence of curl commands:

##### Obtain a JWT token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpassword"}'
```

##### Example JWT response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### Make an authenticated request using the token

```bash
curl -X GET http://localhost:3000/user/1/pets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

##### Example authenticated response

```json
[
  {
    "id": 1,
    "name": "Fluffy",
    "user": {
      "id": 1,
      "name": "John Doe",
      "pets": []
    }
  }
]
```

## How-To Guides

### Setting Up a Custom Module for Providers

Before diving into the How-To Guides, we'll set up a custom module that
includes the necessary providers and exports for `UserModelService`,
`MyVerifyTokenService`, and `MyAppGuard`.

This will ensure that our asynchronous registration examples can
inject these services correctly.

```ts
import { Module } from '@nestjs/common';
import { UserModelService } from './user-model.service';
import { MyVerifyTokenService } from './verify-token.service';
import { MyAppGuard } from './my-app-guard';

@Module({
  providers: [UserModelService, MyVerifyTokenService, MyAppGuard],
  exports: [UserModelService, MyVerifyTokenService, MyAppGuard],
});

export class MyProviderModule {};
```

### 1. Registering AuthJwtModule Synchronously

```ts
import * as jwt from 'jsonwebtoken';
import { Module } from '@nestjs/common';
import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';
import { JwtModule, ExtractJwt } from '@concepta/nestjs-jwt';
import { UserModelService } from './user-model.service';

// define the verifyToken function
const verifyToken = async (
  token: string,
  done: (error: any, payload?: any) => void
) => {
  try {
    const payload = await jwt.verify(token, 'your-secret-key');
    done(null, payload);
  } catch (error) {
    done(error);
  }
};

@Module({
  imports: [
    JwtModule.forRoot({}), // <- required for AuthJwtModule to work
    AuthJwtModule.register({
      userModelService: new UserModelService(), // <- required
      settings: {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        verifyToken,
      },
      verifyTokenService: new MyVerifyTokenService(), // <- optional custom service
      appGuard: new MyAppGuard(), // <- optional custom guard
    }),
  ],
})
export class AppModule {}
```

### 2. Registering AuthJwtModule Asynchronously

```ts
import * as jwt from 'jsonwebtoken';
import { Module } from '@nestjs/common';
import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';
import { JwtModule, ExtractJwt } from '@concepta/nestjs-jwt';
import { ConfigService } from '@nestjs/config';
import { MyProviderModule } from './my-provider.module';

// define the verifyToken function
const verifyToken = (configService: ConfigService) => async (
  token: string,
  done: (error: any, payload?: any) => void
) => {
  try {
    const payload = await jwt.verify(token, configService.get('JWT_SECRET'));
    done(null, payload);
  } catch (error) {
    done(error);
  }
};

@Module({
  imports: [
    JwtModule.forRoot({}), // <- required for AuthJwtModule to work
    MyProviderModule, // <- import the my provider module
    AuthJwtModule.registerAsync({
      imports: [MyProviderModule],
      useFactory: async (
        configService: ConfigService,
        userModelService: UserModelService,
        verifyTokenService: MyVerifyTokenService,
        appGuard: MyAppGuard,
      ) => ({
        userModelService, // injected via useFactory
        settings: {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          verifyToken: verifyToken(configService),
        },
        verifyTokenService, // injected via useFactory
        appGuard, // injected via useFactory
      }),
      inject: [ConfigService, UserModelService, MyVerifyTokenService, MyAppGuard],
    }),
  ],
});

export class AppModule {};
```

### 3. Global Registering AuthJwtModule Asynchronously

```ts
import * as jwt from 'jsonwebtoken';
import { Module } from '@nestjs/common';
import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';
import { JwtModule, ExtractJwt } from '@concepta/nestjs-jwt';
import { ConfigService } from '@nestjs/config';
import { MyProviderModule } from './my-provider.module';

// define the verifyToken function
const verifyToken = (configService: ConfigService) => async (
  token: string,
  done: (error: any, payload?: any) => void
) => {
  try {
    const payload = await jwt.verify(token, configService.get('JWT_SECRET'));
    done(null, payload);
  } catch (error) {
    done(error);
  }
};

@Module({
  imports: [
    JwtModule.forRoot({}), // <- required for AuthJwtModule to work
    MyProviderModule, // <- import the my provider module
    AuthJwtModule.forRootAsync({
      imports: [MyProviderModule],
      useFactory: async (
        configService: ConfigService,
        userModelService: UserModelService,
        verifyTokenService: MyVerifyTokenService,
        appGuard: MyAppGuard,
      ) => ({
        userModelService, // injected via useFactory
        settings: {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          verifyToken: verifyToken(configService),
        },
        verifyTokenService, // injected via useFactory
        appGuard, // injected via useFactory
      }),
      inject: [ConfigService, UserModelService, MyVerifyTokenService, MyAppGuard],
    }),
  ],
});

export class AppModule {};
```

### 4. Using Custom User Model Service

This service is responsible for looking up user information based
on the JWT payload. It implements the `AuthJwtUserModelServiceInterface`
and must be provided to the module.

```ts
import { AuthJwtUserModelServiceInterface } from '@concepta/nestjs-auth-jwt';
import { ReferenceIdInterface, ReferenceSubject } from '@concepta/nestjs-common';

export class UserModelService implements AuthJwtUserModelServiceInterface {
  async bySubject(subject: ReferenceSubject): Promise<ReferenceIdInterface>  {
    // implement user model logic here
  }
}
```

#### 5. Implementing and Using Custom Token Verification Service

This service verifies JWT tokens. If not provided, the default verification
logic will be used. It extends the `VerifyTokenServiceInterface`.

```ts
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { VerifyTokenServiceInterface } from '@concepta/nestjs-authentication';

@Injectable()
export class MyVerifyTokenService implements VerifyTokenServiceInterface {
  accessToken(): ReturnType<JwtService['verifyAsync']> {
    return new Promise((resolve, reject) => {
      try {
        // your custom logic to sign and validate the the token
        resolve({ accessToken: 'access-token' });
      } catch (error) {
        reject(error);
      }
    });
  }

  refreshToken(
    ...args: Parameters<JwtService['verifyAsync']>
  ): ReturnType<JwtService['verifyAsync']> {
    return new Promise((resolve, reject) => {
      try {
        // your custom logic to sign and validate the the token
        resolve({ accessToken: 'refresh-token' });
      } catch (error) {
        reject(error);
      }
    });
  }
}
```

### 6. Setting Up a Custom Guard

To use a custom guard, you need to implement the `CanActivate` interface
from NestJS and provide it in the module configuration.

To take advantage of the ability to enable/disable guards via configuration
settings or with the `@AuthPublic` decorator, it is highly recommended that
you extend `AuthJwtGuard` class or call the `AuthGuard()` class factory from
the `@concepta/nestjs-authentication` module.

#### Step 1: Implement the Custom Guard

Create a custom guard by extending the `AuthJwtGuard`.

```ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@concepta/nestjs-authentication';

@Injectable()
export class MyAppGuard extends AuthJwtGuard {
  canActivate(context: ExecutionContext) {
    // call super class first
    if (!super.canActivate(context)) {
      return false;
    }

    // implement your custom authentication logic here
    return true;
  }
}
```

#### Step 2: Provide the Custom Guard in Module Configuration

Update the module configuration to use the custom guard.

```ts
// ...
AuthJwtModule.registerAsync({
  useFactory: async (userModelService: UserService) => ({
    userModelService,
    appGuard: MyAppGuard, // use the custom guard
  }),
  inject: [UserService],
}),
// ...
```

### 7. Disabling the Guard

To completely disable the global guard for all routes, you can set the
`appGuard` option to false.

#### Disable the Guard in Module Configuration

Update the module configuration to disable the global `APP_GUARD`.

```ts
// ...
AuthJwtModule.registerAsync({
  useFactory: async (userModelService: UserService) => ({
    userModelService,
    appGuard: false, // disable the global APP_GUARD
  }),
  inject: [UserService],
}),
// ...
```

### 8. Overwriting the settings

```ts
import { ExtractJwt, JwtStrategyOptionsInterface } from "@concepta/nestjs-jwt";

const settings: JwtStrategyOptionsInterface = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  verifyToken: async (
    token: string,
    done: (error: any, payload?: any) => void,
  ) => {
    try {
      // add custom logic ot validate token
      const payload = { id: 'user-id' };
      done(null, payload);
    } catch (error) {
      done(error);
    }
  },
};

// ...
AuthJwtModule.registerAsync({
  useFactory: async (userModelService: UserService) => ({
    userModelService,
    settings,
  }),
  inject: [UserService],
}),
// ...
```

### 9. Integration with Other NestJS Modules

Integrate `@concepta/nestjs-auth-jwt` with other NestJS modules like
`@concepta/nestjs-user`, `@concepta/nestjs-auth-local`,
`@concepta/nestjs-auth-refresh`, and more for a comprehensive
authentication system.

# Reference

Detailed Descriptions of All Classes, Methods, and Properties

## 1. AuthJwtModule API Reference

- ### register(options: AuthJwtOptions)

  - Registers the module with synchronous options.

- ### registerAsync(options: AuthJwtAsyncOptions)

  - Registers the module with asynchronous options.

- ### forRoot(options: AuthJwtOptions)

  - Registers the module globally with synchronous options.

- ### forRootAsync(options: AuthJwtAsyncOptions)

  - Registers the module globally with asynchronous options.

- ### forFeature(options: AuthJwtOptions)

  - Registers the module for specific features with custom options.

## 2. AuthJwtOptionsInterface

The `AuthJwtOptionsInterface` provides various configuration options
to customize the behavior of the `AuthJwtModule`.

Below is a summary of the key options:

- ### userModelService (required)

  - Service for looking up user information based on JWT payload.

- ### verifyTokenService (optional)

  - Service for verifying JWT tokens.

- ### appGuard (optional)

  - Custom guard to protect routes; can be set to a custom guard or `false`.

- ### settings (optional)

  - JWT strategy settings, including token extraction and verification logic.

## 3. AuthJwtModule Classes and Interfaces

- AuthJwtUserModelServiceInterface
- VerifyTokenServiceInterface
- JwtStrategyOptionsInterface

# Engineering Concepts

## Conceptual Overview of JWT Authentication

### What is JWT?

JSON Web Tokens (JWT) are a compact, URL-safe means of representing claims to
be transferred between two parties.

The token is composed of three parts: the header, payload, and signature.
The header typically consists of the token type (JWT) and the signing
algorithm (e.g., HMAC SHA256).

The payload contains the claims, which are statements about an entity
(typically, the user) and additional data. The signature is used to verify
that the sender of the JWT is who it says it is and to ensure that the message
wasn't changed along the way.

For more details on JWT, see the
[JWT Introduction](https://jwt.io/introduction/).

### Benefits of Using JWT

JWTs offer several benefits for authentication and authorization:

- **Stateless**: JWTs do not require storing user session information on
the server, which makes them ideal for scalable applications.

- **Compact**: Their small size allows them to be easily passed in URLs,
POST parameters, or inside HTTP headers.

- **Self-contained**: JWTs contain all the necessary information about the
user, avoiding the need to query the database for each request once the user
is authenticated.

- **Security**: JWTs can be signed using a secret (with HMAC algorithm) or
a public/private key pair (with RSA or ECDSA), ensuring the data integrity.

For more benefits, see the [JWT Handbook](https://auth0.com/learn/json-web-tokens/).

## Design Choices in AuthJwtModule

### Why Use NestJS Guards?

Description: NestJS guards provide a way to control the access to various
parts of the application by checking certain conditions before the route
handler is executed.

In `AuthJwtModule`, guards are used to implement authentication and
authorization logic. By using guards, developers can apply security policies
across routes efficiently, ensuring that only authenticated and authorized
users can access protected resources.

Read more about [NestJS Guards](https://docs.nestjs.com/guards).

### Synchronous vs Asynchronous Registration

The `AuthJwtModule` supports both synchronous and asynchronous registration:

- **Synchronous Registration**: This method is used when the configuration
options are static and available at application startup. It simplifies the
setup process and is suitable for most use cases where configuration values
do not depend on external services.

- **Asynchronous Registration**: This method is beneficial when configuration
options need to be retrieved from external sources, such as a database or an
external API, at runtime. It allows for more flexible and dynamic configuration
but requires an asynchronous factory function.

For more on module registration, see the [NestJS Documentation](https://docs.nestjs.com/modules).

### Global vs Feature-Specific Registration

The `AuthJwtModule` can be registered globally or for specific features:

- **Global Registration**: Makes the module available throughout the entire
application. This approach is useful when JWT authentication is required across
all or most routes in the application.

- **Feature-Specific Registration**: Allows the module to be registered only
for specific features or modules within the application. This provides more
granular control, enabling different parts of the application to have distinct
authentication and authorization requirements.

To understand more about global and feature-specific registration, refer to the
[NestJS Module Documentation](https://docs.nestjs.com/modules#global-modules).

## Integrating AuthJwtModule with Other Modules

### How AuthJwtModule Works with AuthLocalModule

The `AuthJwtModule` can be seamlessly integrated with the
`AuthLocalModule` to provide a comprehensive authentication solution.
`AuthLocalModule` handles the initial authentication using local strategies
such as username and password.

Once the user is authenticated, `AuthJwtModule` can issue a JWT that the
user can use for subsequent requests. This integration allows for secure and
efficient authentication processes combining the strengths of both modules.

### Integrating with AuthRefreshModule

Integrating `AuthJwtModule` with `AuthRefreshModule` enables the
application to handle token refresh logic. Refresh tokens are used to obtain
new access tokens without requiring the user to re-authenticate.

This setup enhances the user experience by maintaining sessions securely and
seamlessly. The integration involves configuring both modules to use the same
token issuance and verification mechanisms, ensuring smooth interoperability
and security.
