# Rockets NestJS Federated Authentication

Authenticate via federated login

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-federated)](https://www.npmjs.com/package/@concepta/nestjs-federated)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-federated)](https://www.npmjs.com/package/@concepta/nestjs-federated)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

1. [Tutorials](#tutorials)
   - [Introduction](#introduction)
   - [Getting Started with Federated Authentication](#getting-started-with-federated-authentication)
     - [Step 1: Create User Entity](#step-1-create-user-entity)
     - [Step 2: Create Federated Entity](#step-2-create-federated-entity)
     - [Step 3: Implement FederatedUserModelServiceInterface](#step-3-implement-federatedusermodelserviceinterface)
     - [Step 4: Configure the Module](#step-4-configure-the-module)
     - [Step 5: Integrate with other Oauth Module](#step-5-integrate-with-other-oauth-module)
2. [How-To Guides](#how-to-guides)
   - [Implement FederatedUserModelServiceInterface](#implement-federatedusermodelserviceinterface)
   - [Using federated with Rockets Github Module](#using-federated-with-rockets-github-module)
3. [Reference](#reference)
4. [Explanation](#explanation)
   - [Federated Services](#federated-services)
   - [Module Options Responsibilities](#module-options-responsibilities)

## Tutorials

### Introduction

Before we begin, you'll need to set up OAuth Apps for the social providers you
wish to use (e.g., GitHub, Google, Facebook) to obtain the necessary credentials.
For detailed guides on creating OAuth Apps and obtaining your Client IDs and
Client Secrets, please refer to the official documentation of each provider and
refer to the [`@concepta/nestjs-auth-github`](https://www.rockets.tools/reference/rockets/nestjs-auth-github/README),
[`nestjs-auth-apple`](https://www.rockets.tools/reference/rockets/nestjs-auth-apple/README),
and [`@concepta/nestjs-auth-google`](https://www.rockets.tools/reference/rockets/nestjs-auth-google/README)
documentation to use our modules.

### Getting Started with Federated Authentication

#### Installation

To get started, install the `FederatedModule` package:

`yarn add @concepta/nestjs-federated`

### Step 1: Create User Entity

First, let's create the `UserEntity`:

```ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { FederatedEntity } from '../federated/federated.entity';

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => FederatedEntity, (federated) => federated.user)
  federated!: FederatedEntity;
}
```

### Step 2: Create Federated Entity

Next, create the `FederatedEntity`:

```ts
import { Entity, ManyToOne } from 'typeorm';
import { FederatedSqliteEntity } from '@concepta/nestjs-typeorm-ext';
import { UserEntity } from '../user/user.entity';

@Entity()
export class FederatedEntity extends FederatedSqliteEntity {
  @ManyToOne(() => UserEntity, (user) => user.federated)
  user!: UserEntity;
}
```

### Step 3: Implement FederatedUserModelServiceInterface

Refer to [Implement FederatedUserModelServiceInterface](#implement-federatedusermodelserviceinterface)
section

### Step 4: Configure the Module

Finally, set up the module configuration:

```ts
import { AuthenticationModule } from '@concepta/nestjs-authentication';
import { FederatedModule } from '@concepta/nestjs-federated';
import { JwtModule } from '@concepta/nestjs-jwt';
import { Module } from '@nestjs/common';
import { FederatedUserModelService } from './federated/federated-model.service';
import { FederatedEntity } from './federated/federated.entity';
import { AuthGithubModule } from '@concepta/nestjs-auth-github';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { UserEntity } from './user/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmExtModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [UserEntity, FederatedEntity],
    }),
    JwtModule.forRoot({}),
    AuthenticationModule.forRoot({}),
    TypeOrmExtModule.forFeature({
      federated: {
        entity: FederatedEntity,
      },
    }),
    FederatedModule.forRoot({
      userModelService: new FederatedUserModelService(),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

This configuration uses SQLite for testing, but you can use any database
supported by TypeORM.

### Step 5: Integrate with other Oauth Module

To complete the integration with OAuth providers and set up the whole
authentication flow, you'll need to implement one of the @concepta social
authentication modules. Follow the documentation for the specific module you
want to use:

1. GitHub Authentication:
   Refer to the [@concepta/nestjs-auth-github documentation](https://www.rockets.tools/reference/rockets/nestjs-auth-github/README)
   for detailed instructions on setting up GitHub OAuth authentication.

2. Apple Authentication:
   For Apple Sign-In, follow the [nestjs-auth-apple documentation](https://www.rockets.tools/reference/rockets/nestjs-auth-apple/README)
   to implement Apple's OAuth flow.

3. Google Authentication:
   To set up Google OAuth, consult the [@concepta/nestjs-auth-google documentation](https://www.rockets.tools/reference/rockets/nestjs-auth-google/README)
   for step-by-step guidance.

These documentation resources will guide you through:

- Obtaining the necessary OAuth credentials from the respective providers
- Configuring the OAuth module in your NestJS application
- Setting up the required controllers and routes
- Implementing the authentication flow

By following these provider-specific guides, you'll be able to complete the
federated authentication setup and enable users to log in using their preferred
social accounts.

## How-To Guides

### Implement FederatedUserModelServiceInterface

Create a service that implements `FederatedUserModelServiceInterface`:

```ts
// user.mock.ts
export const mockUser = {
  id: 'abc',
  email: 'me@dispostable.com',
  username: 'me@dispostable.com',
}
```

```ts
// user-model.service.ts
import { Injectable } from '@nestjs/common';
import { ReferenceEmail } from '@concepta/nestjs-common';
import {
  FederatedUserModelServiceInterface 
  FederatedCredentialsInterface,
} from '@concepta/nestjs-federated';
import { mockUser } from './user.mock';


@Injectable()
export class UserModelServiceFixture
  implements FederatedUserModelServiceInterface
{
  async byId(
    id: string
  ): ReturnType<FederatedUserModelServiceInterface['byId']> {
    if (id === mockUser.id) {
      return mockUser;
    } else {
      throw new Error();
    }
  }

  async byEmail(
    email: ReferenceEmail
  ): Promise<UserInterface | null> {
    return email === mockUser.email ? mockUser : null;
  }

  async create(
    _object: ReferenceEmailInterface & ReferenceUsernameInterface
  ): Promise<FederatedCredentialsInterface> {
    return mockUser;
  }
}
```

### Using federated with Rockets Github Module

For detailed instructions on using the federated module with the Rockets GitHub
module, please refer to the [@concepta/nestjs-auth-github documentation](https://www.rockets.tools/reference/rockets/nestjs-auth-github/README).

## Reference

For detailed information on the properties, methods, and classes used in
the `@concepta/nestjs-federated`, please refer to the API documentation
available at
[FederatedModule API Documentation](https://www.rockets.tools/reference/rockets/nestjs-federated/README).
This documentation provides comprehensive details on the interfaces and
services that you can utilize to customize and extend the authentication
functionality within your NestJS application.

## Explanation

### Federated Services

1. **User Creation and Association**: The federated service then takes over:
   - It checks if a user associated with the provider (e.g., GitHub, Google,
    Facebook) account already exists.
   - If the user doesn't exist, it creates a new user account.
   - It associates the provider with the user account, creating a
   link between the user's application account and their provider identity.

### Module Options Responsibilities

The `FederatedOptionsInterface` defines the configuration options for the
federated module. Here are the responsibilities of each option:

- **userModelService**: This is an implementation of the
  `FederatedUserModelServiceInterface`. It is responsible for looking up users
  based on various criteria such as user ID or email. This service ensures that
  the application can retrieve user information from the database or any other
  storage mechanism.

By configuring these options, you can customize the behavior of the federated
module to suit your application's requirements, ensuring seamless integration
with multiple social authentication providers.
