# Rockets NestJS User

A module for managing a basic User entity, including controller with full
CRUD, DTOs, sample data factory and seeder.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-user)](https://www.npmjs.com/package/@concepta/nestjs-user)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-user)](https://www.npmjs.com/package/@concepta/nestjs-user)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/rockets/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Installation

`yarn add @concepta/nestjs-user`

## Usage

```ts
// ...
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { UserModule } from '@concepta/nestjs-user';
import { CrudModule } from '@concepta/nestjs-crud';

@Module({
  imports: [
    TypeOrmExtModule.forRoot({
      type: 'postgres',
      url: 'postgres://user:pass@localhost:5432/postgres',
    }),
    CrudModule.forRoot({}),
    UserModule.forRoot({}),
  ],
})
export class AppModule {}
```

## Configuration

- [Seeding](#seeding)
  - [ENV](#env)

### Seeding

Configurations specific to (optional) database seeding.

#### ENV

Configurations available via environment.

| Variable                                 | Type       | Default        |                                      |
| ---------------------------------------- | ---------- | -------------- | ------------------------------------ |
| `USER_MODULE_SEEDER_AMOUNT`              | `<number>` | `50`           | number of additional users to create |
| `USER_MODULE_SEEDER_SUPERADMIN_USERNAME` | `<string>` | `'superadmin'` | super admin username                 |
