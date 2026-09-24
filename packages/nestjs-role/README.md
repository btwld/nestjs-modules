# Rockets NestJS Role

A module for managing a basic Role entity, including controller with
full CRUD, DTOs, sample data factory and seeder.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-user)](https://www.npmjs.com/package/@concepta/nestjs-user)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-user)](https://www.npmjs.com/package/@concepta/nestjs-user)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Installation

`yarn add @concepta/nestjs-role`

## Usage

```ts
// ...
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { RoleModule } from '@concepta/nestjs-user';
import { CrudModule } from '@concepta/nestjs-crud';

@Module({
  imports: [
    TypeOrmExtModule.register({
      type: 'postgres',
      url: 'postgres://user:pass@localhost:5432/postgres',
    }),
    CrudModule.register(),
    RoleModule.register(),
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

| Variable                   | Type       | Default |                                      |
| -------------------------- | ---------- | ------- | ------------------------------------ |
| `ORG_MODULE_SEEDER_AMOUNT` | `<number>` | `50`    | number of additional users to create |
