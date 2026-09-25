# Rockets NestJS GitHub Federated Authentication

Authenticate requests using GitHub OAuth2

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-auth-github)](https://www.npmjs.com/package/@concepta/nestjs-auth-github)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-auth-github)](https://www.npmjs.com/package/@concepta/nestjs-auth-github)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

1. [Tutorials](#tutorials)
   - [Introduction](#introduction)
   - [Getting Started with GitHub Authentication](#getting-started-with-github-authentication)
     - [Step 1: Associate User Entity to Federated Entity](#step-1-associate-user-entity-to-federated-entity)
     - [Step 2: Associate Federated Entity to User Entity](#step-2-associate-federated-entity-to-user-entity)
     - [Step 3: Environment Variables](#step-3-environment-variables)
     - [Step 4: Configure the Module](#step-4-configure-the-module)
2. [Testing the GitHub Authentication Flow](#testing-the-github-authentication-flow)
3. [How-To Guides](#how-to-guides)
   - [Customizing the Issue Token Service](#customizing-the-issue-token-service)
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

Before we begin, you'll need to set up a GitHub OAuth App to obtain the
necessary credentials. For a detailed guide on creating a GitHub OAuth App
and obtaining your Client ID and Client Secret, please refer to [GitHub's
official documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

### Getting Started with GitHub Authentication

**Prerequisite:** Github module has a dependency on
`@concepta/nestjs-federated`. Ensure you have implemented the `FederatedModule`
before proceeding. Refer to the [Federated API Documentation](https://www.rockets.tools/reference/rockets/nestjs-federated/README)
for more details.

#### Installation

To get started, install the `AuthGithubModule` package:

`yarn add @concepta/nestjs-auth-github`

### Step 1: Associate User Entity to Federated Entity

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

### Step 2: Associate Federated Entity to User Entity

Next, associate the `UserEntity` to the `FederatedEntity`:

```ts
import { Entity, ManyToOne } from 'typeorm';
import { FederatedSqliteEntity } from '@concepta/nestjs-typeorm-ext';
import { UserEntity } from '../user/user.entity';

@Entity()
export class FederatedEntity extends FederatedSqliteEntity {}
```

### Step 3: Environment Variables

`AuthGithubModule` will automatically look for predefined environment
variables, to keep sensitive information secure, use environment variables for
configuration. Here’s how to set them up :

*If you need to overwrite variables or settings, check
[### Implementing custom settings](#implementing-custom-settings)
for more details.*

1. **Create a `.env` file** in the root of your project:

   ```ts
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
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

### Step 4: Configure the Module

Finally, set up the module configuration:

```ts
import { AuthenticationModule, IssueTokenService } from '@concepta/nestjs-authentication';
import { FederatedModule } from '@concepta/nestjs-federated';
import { JwtModule } from '@concepta/nestjs-jwt';
import { Module } from '@nestjs/common';
import { FederatedUserModelService } from './federated/federated-model.service';
import { FederatedEntity } from './federated/federated.entity';
import { AuthGithubModule } from '@concepta/nestjs-auth-github';
import { GitHubIssueTokenService } from './github/issue-token.service';
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
    AuthGithubModule.forRoot({
      issueTokenService: new GitHubIssueTokenService(),
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
supported by TypeORM. The GitHub module has dependencies and should be used
with `nestjs-federated`, `nestjs-jwt`, and `nestjs-authentication`.

## Testing the GitHub Authentication Flow

To test the GitHub authentication flow:

1. Start your NestJS application.
2. Navigate to `/auth/github/login` in your browser. This will redirect you
   to GitHub's login page.
3. After successful GitHub login, you'll be redirected back to your
   application's callback URL (as specified in your GitHub OAuth App settings).
4. The callback will trigger the `IssueTokenService` to generate access and
   refresh tokens.
5. These tokens will be returned in the response, which you can then use for
   authenticated requests to your application.

Remember to replace `github_callback`, `github_clientId`, and
`github_clientSecret` with your actual GitHub OAuth App credentials in the
module configuration.

## How-To Guides

### Customizing the Issue Token Service

To customize the token issuance process:

1. Create a custom service that implements `IssueTokenServiceInterface`.
2. Provide it in the module configuration:

```ts
AuthGithubModule.forRoot({
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

### Overriding Default Controllers

To override the default controllers:

1. Create custom github controllers.
2. Make sure to use `@UseGuards(AuthGithubGuard)` to use github strategy flow.
3. Provide them in the module configuration:

Notes:
The default controller injects the default `IssueTokenService` from
`@concepta/nestjs-authentication` to generate the response payload. If you
decide to override the default controllers, you will need to implement the
logic to generate the response payload. It means that if you overwrite the
controller you do not need to overwrite the `issueTokenService`.

```ts
AuthGithubModule.forRoot({
  controllers: [CustomGithubAuthController],
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
import { AuthGithubGuard } from '@concepta/nestjs-auth-github';

@Controller('auth/github')
@UseGuards(AuthGithubGuard)
@AuthPublic()
export class CustomGithubAuthController {
  constructor() {}

  @Get('login')
  login(): void {
    // TODO: no code needed, Decorator will redirect to github app
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

The credentials for github authentication are `clientId`, `clientSecret`,
`callbackURL` and the property `mapProfile` are defined on settings configuration.

The `mapProfile` function is used to map the GitHub profile to the user entity.
You can have full control over the mapping process. Make sure to create a
function of `MapProfile` type from `@concepta/nestjs-auth-github` and implement
as you need. `mapProfile` is part of `settings` property. You will need to overwrite
all settings if you need a custom map profile.

```ts
import { 
  AuthGithubProfileInterface, 
  AuthGithubCredentialsInterface 
} from '@concepta/nestjs-auth-github';

const customMapProfile = (
  profile: AuthGithubProfileInterface,
): AuthGithubCredentialsInterface => {
  let email = '';

  if (profile.email) {
    email = profile.email;
  } else if (profile.emails && profile.emails.length > 0) {
    email = profile.emails[0].value;
  }

  const result: AuthGithubCredentialsInterface = {
    id: profile?.id ?? '',
    email,
  };
  return result;
};

```

```ts
//...
AuthGithubModule.forRoot({
  // you should overwrite all settings if you need a custom map profile
  settings: {
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
the `@concepta/nestjs-auth-github`, please refer to the API documentation
available at
[AuthGithubModule API Documentation](https://www.rockets.tools/reference/rockets/nestjs-auth-github/README).
This documentation provides comprehensive details on the interfaces and
services that you can utilize to customize and extend the authentication
functionality within your NestJS application.

## Explanation

### Overview of the Flow

The Rockets NestJS GitHub module integrates with the NestJS framework to
provide a seamless authentication experience using GitHub OAuth. The flow
begins when a user attempts to log in via GitHub, triggering a series of
interactions between the application and GitHub's OAuth service.

### OAuth Strategy and Token Issuance

The OAuth strategy, utilizing `passport-github`, allows users to authenticate
using their GitHub accounts. Here’s how the flow works:

1. **User Authentication**: The user clicks the login button, which
   redirects them to GitHub's login page.
2. **Authorization Grant**: After the user logs in and grants permission,
   GitHub redirects back to the application with an authorization code.
3. **Token Exchange**: The application exchanges this authorization code
   for an access token, which is then used to authenticate API requests
   to GitHub.

### Mapping the Profile

The `mapProfile` function is crucial for transforming the response
returned from GitHub into the format required for signing in with
federated services. This function extracts necessary user information
from the GitHub profile, such as the user's ID and email, and maps
it to the structure expected by the application.

By implementing a custom `mapProfile`, developers can ensure that
the user data is correctly formatted and can be used to either create
a new user or associate the user with an existing account in the
federated system.

### Integration with Federated Services

1. **User Creation and Association**: The federated service then takes over:
   - It checks if a user associated with the GitHub account already exists.
   - If the user doesn't exist, it creates a new user account.
   - It associates the GitHub provider with the user account, creating a
   link between the user's application account and their GitHub identity.

2. **Token Issuance**: After successful user creation or retrieval, the
application issues its own access and refresh tokens for the user.

This integration ensures that each GitHub login is correctly mapped to a user
in your application, maintaining a consistent identity across sessions and
logins. Please refer to the `nestjs-federated` documentation for more
information.

### Module Options Responsibilities

- **issueTokenService**: Responsible for generating and managing
  access and refresh tokens. It handles the response payload for
  authentication.

- **AuthGithubController**: Manages the authentication routes,
  handling user login and callback processes. It ensures that the
  user is redirected appropriately during the OAuth flow.

- **Settings**: Contains configuration options for the GitHub
  authentication process, including client ID, client secret, and
  callback URLs and the mapProfile function.

By structuring the application this way, we ensure a clear separation of
concerns, making it easier to manage authentication logic and user
data across different services.
