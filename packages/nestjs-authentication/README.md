# Authentication Module Documentation

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-authentication)](https://www.npmjs.com/package/@concepta/nestjs-authentication)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-authentication)](https://www.npmjs.com/package/@concepta/nestjs-authentication)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Tutorials](#tutorials)
  - [Introduction](#introduction)
    - [Overview of the Library](#overview-of-the-library)
    - [Purpose and Key Features](#purpose-and-key-features)
    - [Installation](#installation)
  - [Getting Started](#getting-started)
    - [Overview](#overview)
    - [Basic Setup](#basic-setup)
    - [Basic Setup in a NestJS Project](#basic-setup-in-a-nestjs-project)
      - [Scenario: Users have a list of pets](#scenario-users-have-a-list-of-pets)
      - [Step 1: Create Entities](#step-1-create-entities)
      - [Step 2: Create Services](#step-2-create-services)
      - [Step 3: Create Controller](#step-3-create-controller)
      - [Step 4: Configure the Module](#step-4-configure-the-module)
    - [First Authentication with JWT](#first-authentication-with-jwt)
      - [Validating the Setup](#validating-the-setup)
      - [Step 1: Obtain a JWT Token](#step-1-obtain-a-jwt-token)
      - [Step 2: Make an Authenticated Request](#step-2-make-an-authenticated-request)
      - [Example Curl Calls](#example-curl-calls)
- [How to Guides](#how-to-guides)
  - [1. How to Set Up AuthenticationModule with forRoot and JwtModule from @concepta/nestjs-jwt](#1-how-to-set-up-authenticationmodule-with-forroot-and-jwtmodule-from-conceptanestjs-jwt)
  - [2. How to Configure AuthenticationModule Settings](#2-how-to-configure-authenticationmodule-settings)
- [Explanation](#explanation)
  - [Conceptual Overview](#conceptual-overview)
    - [What is This Library?](#what-is-this-library)
    - [Benefits of Using This Library](#benefits-of-using-this-library)
  - [Design Choices](#design-choices)
    - [Why Use NestJS Guards?](#why-use-nestjs-guards)
    - [Global, Synchronous vs Asynchronous Registration](#global-synchronous-vs-asynchronous-registration)
  - [Integration Details](#integration-details)
    - [Integrating with Other Modules](#integrating-with-other-modules)

# Tutorials

## Introduction

### Overview of the Library

This module is designed to manage JWT authentication processes within a
NestJS application. It includes services for issuing JWTs, validating user
credentials, and verifying tokens. The services handle the generation of
access and refresh tokens, ensure users are active and meet authentication
criteria, and perform token validity checks, including additional validations
if necessary. This comprehensive approach ensures secure user authentication
and efficient token management.

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

#### Installation

To get started, install the `AuthenticationModule` package:

`yarn add @concepta/nestjs-authentication`

## Getting Started

### Overview

This section covers the basics of setting up the `AuthenticationModule`
in a NestJS application.

### Basic Setup

The `@concepta/nestjs-authentication` module is designed to integrate
seamlessly with other modules in the authentication suite, such as
`@concepta/nestjs-auth-jwt`, `@concepta/nestjs-auth-local`,
`@concepta/nestjs-auth-recovery`, and `@concepta/nestjs-auth-refresh`.

For optimal functionality, it is recommended to use these modules together to
address various aspects of authentication and token management in your NestJS
application.

To set up the `@concepta/nestjs-authentication` module, begin by installing
the necessary packages using your package manager.

Here is a basic example using `yarn`:

```sh
yarn add @concepta/nestjs-authentication @concepta/nestjs-auth-jwt @concepta/nestjs-auth-local @concepta/nestjs-auth-recovery @concepta/nestjs-auth-refresh
```

### Basic Setup in a NestJS Project

#### Scenario: Users have a list of pets

To demonstrate this scenario, we will set up an application
where users can have a list of pets. We will create the necessary entities,
services, module configurations to simulate the environment.

> Note: The `@concepta/nestjs-user` module can be used in place of
> our example `User` related prerequisites.

#### Step 1: Create Entities

First, create the `User` and `Pet` entities.

```typescript
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

```typescript
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

```typescript
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

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['pets'] });
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['pets'],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(userData);
    await this.userRepository.save(newUser);
    return newUser;
  }
}
```

```typescript
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

Create the Model Service for AuthJwtModule

```typescript
// my-jwt-user-model.service.ts
import { AuthJwtUserModelServiceInterface } from '@concepta/nestjs-auth-jwt';
import { ReferenceIdInterface, ReferenceSubject } from '@concepta/nestjs-common';

export class MyJwtUserModelService implements AuthJwtUserModelServiceInterface {
  async bySubject(subject: ReferenceSubject): Promise<ReferenceIdInterface> {
    // return authorized user
    return {
      id: '5b3f5fd3-9426-4c4d-a06d-b4d55079034d',
    };
  }
}
```

Create the Model Service for Auth Local

```ts
// my-auth-local-user-model.service.ts
import { Injectable } from '@nestjs/common';
import { ReferenceUsername } from '@concepta/nestjs-common';
import {
  AuthLocalUserModelServiceInterface,
  AuthLocalCredentialsInterface
} from '@concepta/nestjs-auth-local';

@Injectable()
export class MyAuthLocalUserModelService implements AuthLocalUserModelServiceInterface {
  async byUsername(
    username: ReferenceUsername,
  ): Promise<AuthLocalCredentialsInterface | null> {
    // make sure this method will return a valid user with
    // correct passwordHash and passwordSalt
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

Let's create a password validation service and overwrite
the validate method, for demo purposes only.

```ts
// my-auth-local-user-password-validation.service.ts
import {
  PasswordStorageInterface,
  PasswordValidationService,
} from '@concepta/nestjs-password';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyAuthLocalPasswordValidationService extends PasswordValidationService {
  constructor() {
    super();
  }

  async validate(options: {
    password: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<boolean> {
    // you should call super.validate to use the default password validation
    return true;
  }

  async validateObject<T extends PasswordStorageInterface>(
    password: string,
    object: T,
  ): Promise<boolean> {
    return true;
  }
}

```

Let's create a verify service to validate the token that will be
received in the request.
If we need a custom logic to validate the access token you can
overwrite this service.

```ts
// jwt-verify-token.service.ts
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { VerifyTokenServiceInterface } from '@concepta/nestjs-authentication';
@Injectable()
export class MyJwtVerifyTokenService implements VerifyTokenServiceInterface {
  accessToken() {
    // your custom logic to sign and validate the the token
    return { accessToken: 'access-token' };
  }

  refreshToken(...args) {
    // your custom logic to sign and validate the the token
    return { accessToken: 'refresh-token' };
  }
}
```

#### Step 3: Create Controller

Create a controller to handle the HTTP requests.

> Note: Use the `@AuthPublic` decorator from `@concepta/nestjs-authentication`
on the controller or individual routes if you want to override the
global JWT guard to make the route public.

```typescript
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


  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Post()
  async create(@Body() userData: Partial<User>): Promise<User> {
    return this.userService.create(userData);
  }

  @Get(':id/pets')
  async getPets(@Param('id') userId: number) {
    return this.petService.findByUserId(userId);
  }
}
```

#### Step 4: Configure the Module

Configure the module to include the necessary services, controllers, and guards.

```typescript
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { Module } from '@nestjs/common';

import { Pet } from './entity/pet.entity';
import { User } from './user/user.entity';
import { JwtModule } from '@concepta/nestjs-jwt';
import { AuthenticationModule } from '@concepta/nestjs-authentication';
import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';
import { MyJwtUserModelService } from './services/my-jwt-user-model.service';
import { AuthLocalModule } from '@concepta/nestjs-auth-local';
import { MyAuthLocalUserModelService } from './services/my-auth-local-user-model.service';
import { MyAuthLocalPasswordValidationService } from './services/my-auth-local-password-validation.service';
import { MyJwtVerifyTokenService } from './services/jwt-verify-token.service';

@Module({
  imports: [
    TypeOrmExtModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [User, Pet],
    }),
    AuthLocalModule.forRoot({
      // this service contains the byUsername method
      userModelService: new MyAuthLocalUserModelService(),
      // this service contains the validate the password logic
      passwordValidationService: new MyAuthLocalPasswordValidationService(), //
    }),
    AuthJwtModule.forRoot({
      // this contains the bySubject method that will get user based on the token
      userModelService: new MyJwtUserModelService(),
      // service to validate the jwt token
      verifyTokenService: new MyJwtVerifyTokenService(),
    }),
    AuthenticationModule.forRoot({}),
    JwtModule.forRoot({}),
  ],
})
export class AppModule {}
```

### First Authentication with JWT

#### Validating the Setup

To validate the setup, you can use `curl` commands to simulate frontend requests.

By following these steps, you can validate that the setup is working correctly
and that authenticated requests to the `user` endpoint return the
expected list of pets for a given user.

Here are the steps to test the `user` endpoint:

#### Step 1: Obtain a JWT Token

The `AuthLocalModule` provide a controller with an authentication
endpoint to obtain a JWT token, use `curl` to get the token.

Replace `[auth-url]` with your actual authentication URL, and
`[username]` and `[password]` with valid credentials. For our demo,
since we overwrote the `passwordValidationService`, we can use any password.

```bash
curl -X POST [auth-url] \
  -H "Content-Type: application/json" \
  -d '{"username": "[username]", "password": "[password]"}'
```

This should return a response with a JWT token, which you'll use for
authenticated requests.

#### Step 2: Make an Authenticated Request

Use the JWT token obtained in the previous step to make an authenticated request
to the `user` endpoint. Replace `[jwt-token]`.

```bash
curl -X GET http://localhost:3000/user \
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

Assuming that are alerady inserted the user and its pets, let's try to retrieve it.

```bash
curl -X GET http://localhost:3000/user/5b3f5fd3-9426-4c4d-a06d-b4d55079034d/pets \
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

To get authenticated user, we can use the decorator `@AuthUser()`
this will return whatever was defined at `bySubject` method from
`MyJwtUserModelService`.

```ts
@Get(':id/pets')
  async getPets(
    @AuthUser() user: User,
    @Param('id') userId: number
  ) {
    if (user.id !== userId) throw new UnauthorizedException()
    return this.petService.findByUserId(userId);
  }
```

## How to Guides

### 1. How to Set Up AuthenticationModule with forRoot and JwtModule from @concepta/nestjs-jwt

The `@concepta/nestjs-authentication` module is designed to integrate
seamlessly with other modules in the authentication suite, such as
`@concepta/nestjs-auth-jwt`, `@concepta/nestjs-auth-local`,
`@concepta/nestjs-auth-recovery`, and `@concepta/nestjs-auth-refresh`.

For optimal functionality, it is recommended to use these modules
together to address various aspects of authentication and token management
in your NestJS application.

To set up the `nestjs-authentication` module, begin by installing the
necessary packages using your package manager.

Here is a basic example using `yarn`:

yarn add @nestjs-authentication @concepta/nestjs-jwt

#### Example Setup

To set up the `AuthenticationModule` and `JwtModule`, follow these steps:

**Import the modules** in your application module:

```ts
//...
  AuthenticationModule.forRoot({}),
  AuthJwtModule.forRoot({
    // this model service contains bySubject method
    userModelService: new JwtUserModelService(),
  }),
  JwtModule.forRoot({
    secret: 'your-secret-key',
    signOptions: { expiresIn: '60s' },
  }),
//...
```

This setup configures the `AuthenticationModule` with global
settings and integrates the `JwtModule` for JWT-based authentication.

### 2. How to Configure AuthenticationModule Settings

The `AuthenticationModule` provides several configurable settings to
customize its behavior. Each setting can be defined in the module
configuration and will create default services to be used in other modules.

#### Settings Example

Here is an example of how to configure each property of the settings:

##### 1. enableGuards: Enables or disables guards globally

```ts
//...
AuthenticationModule.forRoot({
  settings: {
    enableGuards: true, // Enables guards globally
  },
}),
//...
```

##### 2. issueTokenService: Custom service for issuing tokens

```ts
//...
  AuthenticationModule.forRoot({
    issueTokenService: new MyIssueTokenService(), // Custom token issuance service
  }),
//...
```

 **Implementation** :

```ts
import { Injectable } from '@nestjs/common';
import { JwtIssueService } from '@concepta/nestjs-jwt';
import { AuthenticationResponseInterface } from '@concepta/nestjs-common';
import { IssueTokenServiceInterface } from '../interfaces/issue-token-service.interface';

@Injectable()
export class MyIssueTokenService implements IssueTokenServiceInterface {
  constructor(protected readonly jwtIssueService: JwtIssueService) {}

  async accessToken(...args: Parameters<JwtIssueService['accessToken']>) {
    return this.jwtIssueService.accessToken(...args);
  }

  async refreshToken(...args: Parameters<JwtIssueService['refreshToken']>) {
    return this.jwtIssueService.refreshToken(...args);
  }

  async responsePayload(
    id: string,
  ): Promise<AuthenticationResponseInterface> {
    const payload = { sub: id };

    const dto = new AuthenticationJwtResponseDto();

    dto.accessToken = await this.accessToken(payload);
    dto.refreshToken = await this.refreshToken(payload);

    return dto;
  }
}
```

##### 3. **verifyTokenService**: Custom service for verifying tokens

```ts
//...
  AuthenticationModule.forRoot({
    verifyTokenService: new MyVerifyTokenService(), // Custom token verification service
  }),
//...
```

**Implementation:**

```ts
import { Injectable } from '@nestjs/common';
import { JwtVerifyService } from '@concepta/nestjs-jwt';
import { ValidateTokenServiceInterface } from '../interfaces/validate-token-service.interface';
import { VerifyTokenServiceInterface } from '../interfaces/verify-token-service.interface';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class MyVerifyTokenService implements VerifyTokenServiceInterface {
  constructor(
    protected readonly jwtVerifyService: JwtVerifyService,
    protected readonly validateTokenService?: ValidateTokenServiceInterface,
  ) {}

  async accessToken(...args: Parameters<JwtVerifyService['accessToken']>) {
    const token = await this.jwtVerifyService.accessToken(...args);

    if (await this.validateToken(token)) {
      return token;
    } else {
      throw new BadRequestException(
        'Access token was verified, but failed further validation.',
      );
    }
  }

  async refreshToken(...args: Parameters<JwtVerifyService['refreshToken']>) {
    const token = await this.jwtVerifyService.refreshToken(...args);

    if (await this.validateToken(token)) {
      return token;
    } else {
      throw new BadRequestException(
        'Refresh token was verified, but failed further validation.',
      );
    }
  }

  private async validateToken(
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    if (this.validateTokenService) {
      return this.validateTokenService.validateToken(payload);
    } else {
      return true;
    }
  }
}
```

##### 4. validateTokenService: Custom service for validating tokens

```ts
//...
AuthenticationModule.forRoot({
  validateTokenService: new MyValidateTokenService(), // Custom token validation service
}),
//...
```

**Implementation:**

```ts
import { Injectable } from '@nestjs/common';
import { ValidateTokenServiceInterface } from '../interfaces/validate-token-service.interface';

@Injectable()
export class MyValidateTokenService implements ValidateTokenServiceInterface {
  async validateToken(payload: Record<string, unknown>): Promise<boolean> {
    // Custom logic to validate the token
    return true;
  }
}
```

## Explanation

### Conceptual Overview

#### What is This Library?

The `@concepta/nestjs-authentication` library is a comprehensive
solution for managing authentication processes within a NestJS application.
It provides services for issuing JWTs, validating user credentials, and
verifying tokens.

The library integrates seamlessly with other modules in the authentication
suite, such as `@concepta/nestjs-auth-jwt`, `@concepta/nestjs-auth-local`,
`@concepta/nestjs-auth-recovery`, and `@concepta/nestjs-auth-refresh`, making
it a versatile choice for various authentication needs.

#### Benefits of Using This Library

- **Secure Token Management**: Robust mechanisms for issuing and managing
  access and refresh tokens.
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

#### Why Use NestJS Guards?

NestJS guards provide a way to control access to various parts of the
application by checking certain conditions before the route handler is executed.
In the `nestjs-authentication` module, guards are used to implement
authentication and authorization logic. By using guards, developers can apply
security policies across routes efficiently, ensuring that only authenticated
and authorized users can access protected resources.

#### Global, Synchronous vs Asynchronous Registration

The `nestjs-authentication` module supports both synchronous and asynchronous
registration:

- **Global Registration**: Makes the module available throughout the entire
  application. This approach is useful when JWT authentication is required across
  all or most routes in the application.
- **Synchronous Registration**: This method is used when the configuration
  options are static and available at application startup. It simplifies the
  setup process and is suitable for most use cases where configuration values do
  not depend on external services.
- **Asynchronous Registration**: This method is beneficial when configuration
  options need to be retrieved from external sources, such as a database or an
  external API, at runtime. It allows for more flexible and dynamic
  configuration but requires an asynchronous factory function.

### Integration Details

#### Integrating with Other Modules

The `nestjs-authentication` module integrates smoothly with other modules in the
authentication suite. Here are some integration details:

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
