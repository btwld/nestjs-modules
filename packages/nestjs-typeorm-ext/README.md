# Rockets NestJS TypeOrm Extended

Extremely powerful extension of the NestJS TypeOrm module that allows your
dynamic modules to accept drop-in replacements of custom entities
and repositories at registration time.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-typeorm-ext)](https://www.npmjs.com/package/@concepta/nestjs-typeorm-ext)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-typeorm-ext)](https://www.npmjs.com/package/@concepta/nestjs-typeorm-ext)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Overview

The TypeOrm Ext module provides a powerful wrapper around the
[@nestjs/typeorm](https://www.npmjs.com/package/@nestjs/typeorm) module.

While still using the identical configuration options of the TypeOrm module,
you can increase the extensibility of your custom module by designing it
to accept custom entity and repository overrides.

This pattern allows you to publish modules that are loosely coupled to their
own entity and repository definitions. This enables implementations of your
module to define their own concrete data storage.

## Installation

`yarn add @concepta/nestjs-typeorm-ext`

## Module Design

Designing your module to use this extension is fairly straight forward,
but a bit too verbose for this readme.

To see how this was implemented in our
[UserModule](https://github.com/btwld/nestjs-modules/blob/main/packages/nestjs-user)
please refer to that module's
[user.module.ts](https://github.com/btwld/nestjs-modules/blob/main/packages/nestjs-user/src/user.module.ts)

## Usage

app.module.ts

```ts
// ...
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { UserModule } from '@concepta/nestjs-user';
import { CustomUserRepository } from 'path/to/custom-user.repository';
import { CustomUser } from 'path/to/custom-user.entity';

@Module({
  imports: [
    TypeOrmExtModule.forRoot({
      type: 'postgres',
      url: 'postgres://user:pass@localhost:5432/postgres',
      entities: [CustomUser],
    }),
    UserModule.forRoot({
      entities: {
        user: { entity: CustomUser, repository: CustomUserRepository },
      },
    }),
  ],
})
export class AppModule {}
```

## Configuration

### Data Source Options

The module options are identical the the NestJS TypeOrm module.
