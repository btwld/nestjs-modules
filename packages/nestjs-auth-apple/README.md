# Rockets NestJS Apple Federated Authentication

Authenticate requests using Apple OAuth2

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-auth-apple)](https://www.npmjs.com/package/@concepta/nestjs-auth-apple)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-auth-apple)](https://www.npmjs.com/package/@concepta/nestjs-auth-apple)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

1. [Tutorials](#tutorials)
   - [Introduction](#introduction)
   - [Getting Started with Apple Authentication](#getting-started-with-apple-authentication)
     - [Step 1: Associate User Entity to Federated Entity](#step-1-associate-user-entity-to-federated-entity)
     - [Step 2: Associate Federated Entity to User Entity](#step-2-associate-federated-entity-to-user-entity)
     - [Step 3: Environment Variables](#step-3-environment-variables)
     - [Step 4: Configure the Module](#step-4-configure-the-module)
2. [Testing the Apple Authentication Flow](#testing-the-apple-authentication-flow)
3. [How-To Guides](#how-to-guides)
   - [Customizing the Issue Token Service](#customizing-the-issue-token-service)
   - [Customizing the Jwt Service](#customizing-the-jwt-service)
   - [Customizing the Auth Apple Service](#customizing-the-auth-apple-service)
   - [Overriding Default Controllers](#overriding-default-controllers)
   - [Implementing custom settings](#implementing-custom-settings)
   - [Implementing custom user model service](#implementing-custom-user-model-service)
4. [Reference](#reference)
5. [Explanation](#explanation)
   - [Overview of the Flow](#overview-of-the-flow)
   - [OAuth Strategy and Token Issuance](#oauth-strategy-and-token-issuance)
   - [Mapping the Profile](#mapping-the-profile)
   - [Integration with Federated Services](#integration-with-federated-services)
   - [Module Options Responsibilities](#module-options-responsibilities)

## Tutorials

### Introduction

#### Prerequisites

Before using this package, ensure you have:

1. Enrolled in the [Apple Developer Program](https://developer.apple.com/programs/).
2. Familiarized yourself with Apple's ["Sign in with Apple" documentation](https://developer.apple.com/sign-in-with-apple/).
3. Created an App ID and Service ID in your Apple Developer Account.
4. Generated a private key for your Service ID in your Apple Developer Account.

#### Setup

For detailed setup instructions, refer to the following resources:

- [What the Heck is Sign In with Apple?](https://developer.okta.com/blog/2019/06/04/what-the-heck-is-sign-in-with-apple)
  A comprehensive blog post explaining the feature and setup process.
- [Apple Auth Setup Guide](https://apple.com/ananay/apple-auth/blob/master/SETUP.md)
  Step-by-step instructions for configuring Apple Sign In.

**Setup:** Apple module has a dependency on
`@concepta/nestjs-federated`. Ensure you have implemented the `FederatedModule`
before proceeding. Refer to the [Federated API Documentation](https://www.rockets.tools/reference/rockets/nestjs-federated/README)
for more details.

#### Installation

To get started, install the `AuthAppleModule` package:

`yarn add @concepta/nestjs-auth-apple`

### Getting Started with Apple Authentication

#### Step 1: Associate User Entity to Federated Entity

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
}
```

#### Step 2: Associate Federated Entity to User Entity

Next, associate the `UserEntity` to the `FederatedEntity`:

```ts
import { Entity, ManyToOne } from 'typeorm';
import { FederatedSqliteEntity } from '@concepta/nestjs-typeorm-ext';
import { UserEntity } from '../user/user.entity';

@Entity()
export class FederatedEntity extends FederatedSqliteEntity {}
```

#### Step 3: Environment Variables

`AuthAppleModule` will automatically look for predefined environment
variables, to keep sensitive information secure, use environment variables for
configuration. Here’s how to set them up:

*If you need to overwrite variables or settings, check
[### Implementing custom settings](#implementing-custom-settings)
for more details.*

1. **Create a `.env` file** in the root of your project:

   ```ts
    APPLE_CLIENT_ID=your_client_id
    APPLE_CALLBACK_URL=your_callback_url
    APPLE_TEAM_ID=your_team_id
    APPLE_KEY_ID=your_key_id
    APPLE_PRIVATE_KEY_LOCATION=your_p8_location
    APPLE_PRIVATE_KEY_STRING=your_private_key_string
    APPLE_SCOPE=your_scope
   ```

2. **Load environment variables** in your application. For NestJS, you can use
the `@nestjs/config` package:

   ```typescript
   import { ConfigModule } from '@nestjs/config';

   @Module({
     imports: [
       ConfigModule.forRoot({
         isGlobal: true,
       }),
       // other modules
     ],
   })
   export class AppModule {}
   ```

#### Step 4: Configure the Module

Finally, set up the module configuration:

```ts
import { AuthenticationModule, IssueTokenService } from '@concepta/nestjs-authentication';
import { FederatedModule } from '@concepta/nestjs-federated';
import { JwtModule } from '@concepta/nestjs-jwt';
import { Module } from '@nestjs/common';
import { FederatedUserModelService } from './federated/federated-model.service';
import { FederatedEntity } from './federated/federated.entity';
import { AuthAppleModule } from '@concepta/nestjs-auth-apple';
import { MyIssueTokenService } from './apple/my-issue-token.service';
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
    AuthAppleModule.forRoot({
      issueTokenService: new MyIssueTokenService(),
    }),
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
supported by TypeORM. The Apple module has dependencies and should be used
with `nestjs-federated`, `nestjs-jwt`, and `nestjs-authentication`.

## Testing the Apple Authentication Flow

To test the Apple authentication flow:

1. Start your NestJS application.
2. Navigate to `/auth/apple/login` in your browser. This will redirect you
   to Apple's login page.
3. After successful Apple login, you'll be redirected back to your
   application's callback URL (as specified in your Apple OAuth App settings).
4. The callback will trigger the `IssueTokenService` to generate access and
   refresh tokens.
5. These tokens will be returned in the response, which you can then use for
   authenticated requests to your application.

Remember to replace `apple_callback`, `apple_clientId`, and
`apple_clientSecret` with your actual Apple OAuth App credentials in the
module configuration.

## How-To Guides

### Customizing the Issue Token Service

To customize the token issuance process:

1. Create a custom service that implements `IssueTokenServiceInterface`.
2. Provide it in the module configuration:

```ts
AuthAppleModule.forRoot({
  issueTokenService: new MyIssueTokenService(),
  // other options...
})
```

For a detailed implementation example, refer to:

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

### Customizing the Jwt Service

The jwtService will be used to verify and decode the idToken from Apple.
To customize the jwt service:

1. Create a custom service that implements `JwtVerifyServiceInterface`.
2. Provide it in the module configuration:

```ts
import { JwtService } from '@concepta/nestjs-jwt';
// ...
AuthAppleModule.forRoot({
  jwtService: new JwtService({
    // ... options
  }),
})
```

### Customizing the Auth Apple Service

Create a custom service that implements `AuthAppleServiceInterface`, this
service will be responsable for verify and decode the idToken from Apple.

```ts
import { JwtService } from '@concepta/nestjs-jwt';
// ...
AuthAppleModule.forRoot({
  authAppleService: new MyAuthAppleService(),
})
```

For a detailed implementation example, refer to:

```ts
import { Injectable } from '@nestjs/common';
import {
  AuthAppleProfileInterface,
  AuthAppleServiceInterface
} from '@concepta/nestjs-auth-apple';

@Injectable()
export class MyAuthAppleService implements AuthAppleServiceInterface {
  constructor(
  ) {}

  // Function to verify JWT token
  public async verifyIdToken(
    idToken: string,
  ): Promise<AuthAppleProfileInterface> {
    // decode and validate token
  
  }


  public validateClaims(tokenPayload: AuthAppleProfileInterface) {
    // Function to validate claims like issuer, audience, and expiration
  }
}

```

### Overriding Default Controllers

To override the default controllers:

1. Create custom apple controllers.
2. Make sure to use `@UseGuards(AuthAppleGuard)` to use apple strategy flow.
3. Provide them in the module configuration:

Notes:
The default controller injects the default `IssueTokenService` from
`@concepta/nestjs-authentication` to generate the response payload. If you
decide to override the default controllers, you will need to implement the
logic to generate the response payload. It means that if you overwrite the
controller you do not need to overwrite the `issueTokenService`.

```ts
AuthAppleModule.forRoot({
  controllers: [CustomAppleAuthController],
  // other options...
})
```

For a detailed implementation example, refer to:

```ts
import {
  AuthPublic,
  AuthUser
} from '@concepta/nestjs-authentication';
import {
  AuthenticatedUserInterface,
  AuthenticationResponseInterface,
} from '@concepta/nestjs-common';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthAppleGuard } from '@concepta/nestjs-auth-apple';

@Controller('auth/apple')
@UseGuards(AuthAppleGuard)
@AuthPublic()
export class CustomAppleAuthController {
  constructor() {}

  @Get('login')
  login(): void {
    // TODO: no code needed, Decorator will redirect to apple app
    return;
  }

  @Get('callback')
  async get(
    @AuthUser() user: AuthenticatedUserInterface,
  ): Promise<AuthenticationResponseInterface> {
    // user information should be used to generate response payload, 
    return {
      accessToken: 'my_access_token',
      refreshToken: 'my_refresh_token',
    }
  }
}

```

### Implementing custom settings

The credentials for apple authentication are `clientId`, `clientSecret`,
`callbackURL` and the property `mapProfile` are defined on settings configuration.

The `mapProfile` function is used to map the Apple profile to the user entity.
You can have full control over the mapping process. Make sure to create a
function of `MapProfile` type from `@concepta/nestjs-auth-apple` and implement
as you need. `mapProfile` is part of `settings` property. You will need to overwrite
all settings if you need a custom map profile.

```ts
import { 
  AuthAppleProfileInterface, 
  AuthAppleCredentialsInterface 
} from '@concepta/nestjs-auth-apple';

const customMapProfile = (
  profile: AuthAppleProfileInterface,
): AuthAppleCredentialsInterface => {
  let email = '';

  if (profile.email) {
    email = profile.email;
  } else if (profile.emails && profile.emails.length > 0) {
    email = profile.emails[0].value;
  }

  const result: AuthAppleCredentialsInterface = {
    id: profile?.id ?? '',
    email,
  };
  return result;
};

```

```ts
//...
AuthAppleModule.forRoot({
  // you should overwrite all settings if you need a custom map profile
  settings: {
    callbackURL: process.env.APPLE_CALLBACK_URL,
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    mapProfile: customMapProfile
  }
})
//...
```

### Implementing custom user model service

If you need to customize, how to get the user information, or how to create
the user, you will need to update the federated options. Please refer for
the [Federated API Documentation](https://www.rockets.tools/reference/rockets/nestjs-federated/README)
documentation.

## Reference

For detailed information on the properties, methods, and classes used in
the `@concepta/nestjs-auth-apple`, please refer to the API documentation
available at
[AuthAppleModule API Documentation](https://www.rockets.tools/reference/rockets/nestjs-auth-apple/README).
This documentation provides comprehensive details on the interfaces and
services that you can utilize to customize and extend the authentication
functionality within your NestJS application.

## Explanation

### Overview of the Flow

The Rockets NestJS Apple module integrates with the NestJS framework to
provide a seamless authentication experience using Apple OAuth. The flow
begins when a user attempts to log in via Apple, triggering a series of
interactions between the application and Apple's OAuth service.

### OAuth Strategy and Token Issuance

The OAuth strategy, utilizing `passport-apple`, allows users to authenticate
using their Apple accounts. Here’s how the flow works:

1. **User Authentication**: The user clicks the login button, which
   redirects them to Apple's login page.
2. **Authorization Grant**: After the user logs in and grants permission,
   Apple redirects back to the application with an authorization code.
3. **Token Exchange**: The application exchanges this authorization code
   for an access token, which is then used to authenticate API requests
   to Apple.

### Mapping the Profile

The `mapProfile` function is crucial for transforming the response
returned from Apple into the format required for signing in with
federated services. This function extracts necessary user information
from the Apple profile, such as the user's ID and email, and maps
it to the structure expected by the application.

By implementing a custom `mapProfile`, developers can ensure that
the user data is correctly formatted and can be used to either create
a new user or associate the user with an existing account in the
federated system.

### Integration with Federated Services

1. **User Creation and Association**: The federated service then takes over:
   - It checks if a user associated with the Apple account already exists.
   - If the user doesn't exist, it creates a new user account.
   - It associates the Apple provider with the user account, creating a
   link between the user's application account and their Apple identity.

2. **Token Issuance**: After successful user creation or retrieval, the
application issues its own access and refresh tokens for the user.

This integration ensures that each Apple login is correctly mapped to a user
in your application, maintaining a consistent identity across sessions and
logins. Please refer to the `nestjs-federated` documentation for more
information.

### Module Options Responsibilities

- **jwtService**: Responsible for verifying Apple tokens. It ensures the
  validity and integrity of the tokens received from Apple.

- **issueTokenService**: Responsible for generating and managing access and
  refresh tokens. It handles the response payload for authentication.

- **authAppleService**: Manages the Apple authentication process, handling user
  login and callback processes. It ensures that the user is authenticated
  correctly.

- **Settings**: Contains configuration options for the Apple authentication
  process, including client ID, client secret, callback URLs, and the
  `mapProfile` function.

#### Settings Configuration Properties

The `authAppleDefaultConfig` provides several configuration properties that can
be customized via environment variables. Below is a detailed description of
each property:

- **loginDto**: The Data Transfer Object (DTO) used for login. This is defined
  by the `AuthAppleLoginDto` class.

- **clientID**: The client ID for the Apple application. This can be set via
  the `APPLE_CLIENT_ID` environment variable. Defaults to `''`.

- **callbackURL**: The callback URL for the Apple authentication process. This
  can be set via the `APPLE_CALLBACK_URL` environment variable. Defaults to
  `''`.

- **teamID**: The team ID associated with the Apple developer account. This can
  be set via the `APPLE_TEAM_ID` environment variable. Defaults to `''`.

- **keyID**: The key ID for the Apple private key. This can be set via the
  `APPLE_KEY_ID` environment variable. Defaults to `''`.

- **privateKeyLocation**: The file location of the Apple private key. This can
  be set via the `APPLE_PRIVATE_KEY_LOCATION` environment variable. Defaults to
  `''`.

- **privateKeyString**: The string representation of the Apple private key.
  This can be set via the `APPLE_PRIVATE_KEY_STRING` environment variable.
  Defaults to `''`.

- **passReqToCallback**: A boolean indicating whether to pass the request to
  the callback. Defaults to `false`.

- **scope**: The scope of the Apple authentication. This can be set via the
  `APPLE_SCOPE` environment variable. If not set, defaults to `['email']`. The
  scope is parsed using the `authAppleScopeParser` utility.

- **mapProfile**: A function to map the Apple profile to the application's user
  profile. This is defined by the `mapProfile` utility function.

By structuring the application this way, we ensure a clear separation of
concerns, making it easier to manage authentication logic and user
data across different services.
