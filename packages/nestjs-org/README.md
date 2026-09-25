# Rockets NestJS Org

A module for managing a basic Org entity, including controller
with full CRUD, DTOs, sample data factory and seeder.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-org)](https://www.npmjs.com/package/@concepta/nestjs-org)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-org)](https://www.npmjs.com/package/@concepta/nestjs-org)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Installation

`yarn add @concepta/nestjs-org`

## Usage

```ts
// ...
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { CrudModule } from '@concepta/nestjs-crud';
import { OrgModule } from '@concepta/nestjs-org';

@Module({
  imports: [
    TypeOrmExtModule.forRoot({
      type: 'postgres',
      url: 'postgres://user:pass@localhost:5432/postgres',
    }),
    CrudModule.forRoot({}),
    OrgModule.forRoot({}),
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
