# Rockets NestJS Coralogix

This module is a drop-in replacement for the core NestJS coralogix that
provides additional support for pushing log data to one or multiple external
log consumption providers.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-coralogix)](https://www.npmjs.com/package/@concepta/nestjs-coralogix)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-coralogix)](https://www.npmjs.com/package/@concepta/nestjs-coralogix)
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
      - [Scenario: Logging in a NestJS Application](#scenario-logging-in-a-nestjs-application)
      - [Step 1: Use Coralogix in Application](#step-1-use-coralogix-in-application)
      - [Step 2: Setup environment variables](#step-2-setup-environment-variables)
- [How to Guides](#how-to-guides)
  - [1. How to Configure LoggerCoralogixModule Settings](#1-how-to-configure-loggercoralogixmodule-settings)
  - [2. How to register for asynchronous registration](#2-how-to-register-for-asynchronous-registration)
- [Explanation](#explanation)
  - [Conceptual Overview](#conceptual-overview)
    - [What is This Library?](#what-is-this-library)
    - [Benefits of Using This Library](#benefits-of-using-this-library)
  - [Design Choices](#design-choices)
    - [Why Use Custom Coralogix?](#why-use-custom-coralogix)
    - [Global, Synchronous vs Asynchronous Registration](#global-synchronous-vs-asynchronous-registration)
  - [Integration Details](#integration-details)
    - [Integrating with Other Modules](#integrating-with-other-modules)
- [References](#references)

# Tutorials

## Introduction

### Overview of the Library

This module wraps/extends the core NestJS `Coralogix` and adds a powerful
external transports plugin interface.

> See the NestJS [Coralogix](https://docs.nestjs.com/techniques/coralogix)
> documentation for more details on how logging is implemented in NestJS.

### Purpose and Key Features

- **External Transports**: Provides support for pushing log data to external
  log consumption providers like Sentry.
- **Customizable**: Allows for the creation of custom transports to suit
  different logging needs.
- **Seamless Integration**: Integrates smoothly with existing NestJS
  applications.

### Installation

To get started, install the `@concepta/nestjs-coralogix` package:

```sh
yarn add @concepta/nestjs-coralogix
```

## Getting Started

### Overview

This section covers the basics of setting up the `LoggerCoralogixModule` in a
NestJS application.

### Basic Setup

#### Scenario: Logging in a NestJS Application

To demonstrate this scenario, we will set up an application where the
`LoggerCoralogixModule` is used to log messages.

#### Step 1: Use Coralogix in Application

Let's create a controller to call the loggerService

```ts
import { Controller, Get } from '@nestjs/common';
import { LoggerService } from '@concepta/nestjs-logger';

@Controller()
export class AppController {
  constructor(private loggerService: LoggerService) {}
  @Get('log')
  logError() {
    this.loggerService.error('throwError', 'error');
  }
}
```

Finally, we import `LoggerCoralogixModule` and `LoggerModule` to use the
`LoggerCoralogixTransport` in our application, however `loggerService` will
handle that for you. All you need to do is just define the transport on
`LoggerModule`.

```typescript
import { LogLevel, Module } from '@nestjs/common';
import { Severity } from 'coralogix-logger';
import { LoggerModule } from '@concepta/nestjs-logger';
import { AppController } from './app.controller';
import { LoggerCoralogixModule, LoggerCoralogixTransport } from '@concepta/nestjs-logger-coralogix';

@Module({
  controllers: [AppController],
  imports: [
    LoggerCoralogixModule.forRoot({
      settings: {
        logLevel: ['warn'],
        transportConfig: {
          privateKey: 'private',
          category: 'logging',
          logLevelMap: (_logLevel: LogLevel): Severity => {
            return Severity.info;
          },
        },
      },
    }),
    LoggerModule.forRootAsync({
      inject: [LoggerCoralogixTransport],
      useFactory: (loggerCoralogixTransport: LoggerCoralogixTransport) => {
        return {
          transports: [loggerCoralogixTransport],
        };
      },
    }),
  ],
})
export class AppModule {}

```

#### Step 2: Setup environment variables

To use the default configuration, you need to define the environments
variables. One of the ways you can do that is using `.env` file. For
the private key make sure to use a `Send-Your-Data API` key.

```zsh
// .env file

CORALOGIX_LOG_LEVEL="log,error"
CORALOGIX_CATEGORY='my-category'
CORALOGIX_APPLICATION_NAME='my-application'
CORALOGIX_PRIVATE_KEY='my-private-key'
CORALOGIX_SUBSYSTEM_NAME='my-subsystem-name'
```

#### Step 3: Global Coralogix Setup

To set up the coralogix globally, configure it in the `bootstrap` function.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from '@concepta/nestjs-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const loggerService = app.get(LoggerService);
  app.useLogger(LoggerService);
  await app.listen(3000);
}
bootstrap();
```

# How to Guides

## 1. How to Configure LoggerCoralogixModule Settings

The `LoggerCoralogixModule` provides several configurable settings to
customize its behavior.

### Settings Example

Here is an example of how to configure each property of the settings:

#### 1. logLevel: Sets the log level for the coralogix

```typescript
LoggerCoralogixModule.forRoot({
  settings: {
    logLevel: ['warn'],
  },
}),
```

### 2. How to register for asynchronous registration

```ts
// ...
import { LoggerCoralogixModule } from '@concepta/nestjs-coralogix';

@Module({
  imports: [
    LoggerCoralogixModule.registerAsync({
      imports: [ConfigModule.forFeature(myConfig)],
      inject: [myConfig.KEY],
      useFactory: async (
        appConfig: MyAppOptionsInterface,
      ): Promise<CoralogixOptionsInterface> => appConfig.coralogix
  ]
});
export class App {}
```

# Explanation

## Conceptual Overview

### What is This Library?

The `@nestjs-coralogix` library is a comprehensive solution for managing
logging processes within a NestJS application. It provides services for
logging messages and supports external log consumption providers.

### Benefits of Using This Library

- **External Transports**: Supports pushing log data to external providers.
- **Customizable**: Allows for the creation of custom transports.
- **Seamless Integration**: Integrates smoothly with existing NestJS
applications.

## Design Choices

### Why Use Custom Coralogix?

Custom loggers provide more flexibility and control over how log messages are
handled and where they are sent.

### Global, Synchronous vs Asynchronous Registration

The `LoggerCoralogixModule` supports both synchronous and asynchronous
registration:

- **Global Registration**: Makes the module available throughout the entire
application.
- **Synchronous Registration**: Used when configuration options are static and
available at application startup.
- **Asynchronous Registration**: Beneficial when configuration options need to
be retrieved from external sources at runtime.

## Integration Details

### Integrating with Other Modules

The `LoggerCoralogixModule` integrates smoothly with other NestJS modules.
Here are some integration details:

- **@nestjs/common**: Use the `LoggerService` from `@concepta/nestjs-logger`
to replace the default NestJS logger.
- **External Transports**: Create custom transports to send log data to
external providers like Sentry.

# References

For further details and external references, please visit the following link:

[NestJS Coralogix Documentation](https://docs.nestjs.com/techniques/coralogix)
