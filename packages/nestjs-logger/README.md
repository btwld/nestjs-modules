# Rockets NestJS Logger

This module is a drop-in replacement for the core NestJS logger that provides
additional support for pushing log data to one or multiple external log
consumption providers.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-logger)](https://www.npmjs.com/package/@concepta/nestjs-logger)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-logger)](https://www.npmjs.com/package/@concepta/nestjs-logger)
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
      - [Step 1: Configure Logger Module](#step-1-configure-logger-module)
      - [Step 2: Use Logger in Application](#step-2-use-logger-in-application)
      - [Step 3: Setup environment variables](#step-3-setup-environment-variables)
      - [Step 3: Global Logger Setup](#step-3-global-logger-setup)
- [How to Guides](#how-to-guides)
  - [1. How to Configure LoggerModule Settings](#1-how-to-configure-loggermodule-settings)
  - [2. How to register for asynchronous registration](#2-how-to-register-for-asynchronous-registration)
  - [3. How to set up custom transports](#3-how-to-set-up-custom-transports)
  - [4. Using SentryTransport](#4-using-sentrytransport)
  - [5. Using CoralogixTransport](#5-using-coralogixtransport)
- [Explanation](#explanation)
  - [Conceptual Overview](#conceptual-overview)
    - [What is This Library?](#what-is-this-library)
    - [Benefits of Using This Library](#benefits-of-using-this-library)
  - [Design Choices](#design-choices)
    - [Why Use Custom Logger?](#why-use-custom-logger)
    - [Global, Synchronous vs Asynchronous Registration](#global-synchronous-vs-asynchronous-registration)
  - [Integration Details](#integration-details)
    - [Integrating with Other Modules](#integrating-with-other-modules)
- [References](#references)

# Tutorials

## Introduction

### Overview of the Library

This module wraps/extends the core NestJS `Logger` and adds a powerful
external transports plugin interface.

> See the NestJS [Logger](https://docs.nestjs.com/techniques/logger)
documentation for more details on how logging is implemented in NestJS.

### Purpose and Key Features

- **External Transports**: Provides support for pushing log data to external
log consumption providers like Sentry.
- **Customizable**: Allows for the creation of custom transports to suit
different logging needs.
- **Seamless Integration**: Integrates smoothly with existing NestJS applications.

### Installation

To get started, install the `@concepta/nestjs-logger` package:

```sh
yarn add @concepta/nestjs-logger
```

## Getting Started

### Overview

This section covers the basics of setting up the `LoggerModule` in a NestJS
application.

### Basic Setup

#### Scenario: Logging in a NestJS Application

To demonstrate this scenario, we will set up an application where
the `LoggerModule` is used to log messages.

#### Step 1: Configure Logger Module

Next, configure the `LoggerModule` in your application module.

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@concepta/nestjs-logger';

@Module({
  imports: [
    LoggerModule.register({
      // Custom configuration here
    }),
  ],
})
export class AppModule {}
```

#### Step 2: Use Logger in Application

Finally, use the `LoggerService` in your application.

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@concepta/nestjs-logger';

@Injectable()
class MyService {
  constructor(private loggerService: LoggerService) {}

  doSomething() {
    this.loggerService.log('Doing something...');
  }
}
```

#### Step 3: Setup environment variables

To use the default configuration, you need to define the environments
variables. One of the ways you can do that is using `.env` file

```zsh
// .env file

LOG_LEVEL="log,error"
```

#### Step 3: Global Logger Setup

To set up the logger globally, configure it in the `bootstrap` function.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from '@concepta/nestjs-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);
  await app.listen(3000);
}
bootstrap();
```

# How to Guides

## 1. How to Configure LoggerModule Settings

The `LoggerModule` provides several configurable settings to customize its
behavior.

### Settings Example

Here is an example of how to configure each property of the settings:

#### 1. logLevel: Sets the log level for the logger

```typescript
LoggerModule.forRoot({
  logLevel: ['log', 'error'],
});
```

#### 2. transports: Adds custom transports for logging

```typescript
LoggerModule.forRoot({
  transports: [new MyCustomTransport()],
});
```

## 2. How to register for asynchronous registration

```ts
// ...
import { LoggerModule } from '@concepta/nestjs-logger';

@Module({
  imports: [
    LoggerModule.registerAsync({
      imports: [ConfigModule.forFeature(myConfig)],
      inject: [myConfig.KEY],
      useFactory: async (
        appConfig: MyAppOptionsInterface,
      ): Promise<LoggerOptionsInterface> => appConfig.logger
  ]
});
export class App {}
```

## 3. How to set up custom transports

To set up the `LoggerModule` with custom transports, follow these steps:

**create custom transport** in your application module:

```ts
//...
@Injectable()
export class MyCustomTransport implements LoggerTransportInterface {
  constructor() {}
  
  public logLevel?: LogLevel[] | null;

  log(message: string, logLevel: LogLevel, error?: Error | string): void {
    // custom logic here
  }
}

```

**Import the modules** in your application module:

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@concepta/nestjs-logger';
import { MyCustomTransport } from './my-custom-transport';

@Module({
  imports: [
    LoggerModule.forRoot({
      transports: [new MyCustomTransport()],
    }),
  ],
})
export class AppModule {}
```

## 4. Using SentryTransport

Add `@concepta/nestjs-logger-sentry` for your project and import
`LoggerSentryModule`, make sure to pass the correct confirguations
`transportSentrySettings`. Please check [`@concepta/nestjs-logger-sentry`]
(<https://www.npmjs.com/package/@concepta/nestjs-logger-sentry>) for more
details of how to setup module correctly.

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@concepta/nestjs-logger';
import { 
  LoggerSentryModule, 
  LoggerSentryTransport
} from '@concepta/nestjs-logger-sentry';

@Module({
  imports: [
    LoggerSentryModule.forRoot({
      settings: transportSentrySettings
    }),
    LoggerModule.forRootAsync({
      inject: [LoggerSentryTransport],
      useFactory: (loggerSentryTransport: LoggerSentryTransport) => {
        return {
          transports:[loggerSentryTransport]
        }
      }
    }),
  ]
})
export class AppModule {}
```

## 5. Using CoralogixTransport

Add `@concepta/nestjs-logger-coralogix` for your project and import
`LoggerCoralogixModule`, make sure to pass the correct confirguations
`transportSentrySettings`. Please check [`@concepta/nestjs-logger-coralogix`]
(<https://www.npmjs.com/package/@concepta/nestjs-logger-coralogix>) for more
details of how to setup module correctly.

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@concepta/nestjs-logger';
import { 
  LoggerCoralogixModule, 
  LoggerCoralogixTransport
} from '@concepta/nestjs-logger-coralogix';

@Module({
  imports: [
    LoggerCoralogixModule.forRoot({
      settings: transportCoralogixSettings
    }),
    LoggerModule.forRootAsync({
      inject: [LoggerCoralogixTransport],
      useFactory: (loggerCoralogixTransport: LoggerCoralogixTransport) => {
        return {
          transports:[loggerCoralogixTransport]
        }
      }
    }),
  ]
})
export class AppModule {}
```

# Explanation

## Conceptual Overview

### What is This Library?

The `@nestjs-logger` library is a comprehensive solution for managing logging
 processes within a NestJS application. It provides services for logging
 messages and supports external log consumption providers.

### Benefits of Using This Library

- **External Transports**: Supports pushing log data to external providers.
- **Customizable**: Allows for the creation of custom transports.
- **Seamless Integration**: Integrates smoothly with existing NestJS
applications.

## Design Choices

### Why Use Custom Logger?

Custom loggers provide more flexibility and control over how log messages are
handled and where they are sent.

### Global, Synchronous vs Asynchronous Registration

The `LoggerModule` supports both synchronous and asynchronous registration:

- **Global Registration**: Makes the module available throughout the
entire application.
- **Synchronous Registration**: Used when configuration options are static and
available at application startup.
- **Asynchronous Registration**: Beneficial when configuration options need to
be retrieved from external sources at runtime.

## Integration Details

### Integrating with Other Modules

The `LoggerModule` integrates smoothly with other NestJS modules. Here are
some integration details:

- **@nestjs/common**: Use the `LoggerService` from `@concepta/nestjs-logger`
to replace the default NestJS logger.
- **External Transports**: Create custom transports to send log data to
external providers like Sentry.

# References

For further details and external references, please visit the following link:

[NestJS Logger Documentation](https://docs.nestjs.com/techniques/logger)
