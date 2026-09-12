# @concepta/nestjs-repository-typeorm

TypeORM driver for `@concepta/nestjs-repository`. Provides `TypeOrmRepository`
(extending `RepositoryAdapter`), `TypeOrmTransaction` / `TypeOrmTransactionFactory`
for automatic transaction management, WhereClause-to-TypeORM translation, and
database-specific base entities for Postgres and SQLite.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-repository-typeorm)](https://www.npmjs.com/package/@concepta/nestjs-repository-typeorm)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-repository-typeorm)](https://www.npmjs.com/package/@concepta/nestjs-repository-typeorm)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-repository-typeorm%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [TypeOrmRepository](#typeormrepository)
- [WhereClause Translation](#whereclause-translation)
- [Transaction Support](#transaction-support)
- [Repository Hooks](#repository-hooks)
- [Base Entities](#base-entities)
- [Exceptions](#exceptions)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-repository-typeorm @nestjs/common typeorm
```

### Requirements

ESM-only — no CJS build is published. Requires Node `>= 22.12` and
NestJS 12.

### Dependencies

| Package | Notes |
| --- | --- |
| `@concepta/nestjs-core` | Core interfaces, utilities, and hook system |
| `@concepta/nestjs-repository` | Abstract repository layer (`RepositoryAdapter`) |
| `@nestjs/typeorm` | TypeORM integration for NestJS |
| `@tsyche/membrane` | Hook pipeline (`Permeator`/`Membrane`) |

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS core — install explicitly, no longer bundled |
| `typeorm` | Yes | TypeORM ^0.3.0 |

## Module Registration

### With RepositoryModule (recommended)

Use `RepositoryModule.forFeature()` to register entities through the
TypeORM driver. This provides transaction management, repository hooks,
and duplicate key detection.

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgres://user:pass@localhost:5432/mydb',
      entities: [OrderEntity, CustomerEntity],
    }),
    RepositoryModule.forRoot({}),
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: 'orders', entity: OrderEntity },
        { key: 'customers', entity: CustomerEntity },
      ],
    }),
  ],
})
export class AppModule {}
```

Each entity key creates a `TypeOrmRepository` instance injectable via
`@InjectDynamicRepository(key)`.

### Direct Usage

`TypeOrmRepositoryModule` can also be used directly without `RepositoryModule`:

```ts
@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    TypeOrmRepositoryModule.forFeature([
      { key: 'orders', entity: OrderEntity },
      { key: 'customers', entity: CustomerEntity, dataSource: 'secondary' },
      { key: 'audit', entity: AuditLog, factory: createAuditRepository },
    ]),
  ],
})
export class AppModule {}
```

### Provider Options

```ts
interface TypeOrmProviderOptionsInterface<Entity> extends RepositoryProviderOptions<Entity> {
  key: string;                                             // Injection key
  entity: Type<Entity>;                                    // TypeORM entity class
  dataSource?: TypeOrmDataSourceToken;                     // Data source (default: 'default')
  factory?: (dataSource: DataSource) => Repository<Entity>; // Custom repository factory
}
```

- **`key`** -- string key used with `@InjectDynamicRepository(key)`
- **`entity`** -- TypeORM entity class
- **`dataSource`** -- optional data source name, `DataSource` instance, or
  `DataSourceOptions`; defaults to `'default'`
- **`factory`** -- optional factory for custom TypeORM repositories; receives
  `DataSource`, returns `Repository<Entity>`

### Injecting Repositories

```ts
import { Injectable } from '@nestjs/common';
import { InjectDynamicRepository } from '@concepta/nestjs-repository';
import { TypeOrmRepository } from '@concepta/nestjs-repository-typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectDynamicRepository('orders')
    private readonly orderRepo: TypeOrmRepository<OrderEntity>,
  ) {}

  async findAll(): Promise<OrderEntity[]> {
    return this.orderRepo.find();
  }
}
```

## TypeOrmRepository

`TypeOrmRepository` extends `RepositoryAdapter` from
`@concepta/nestjs-repository` and implements the protected `do*` template
methods using TypeORM; the public methods below are inherited concrete
wrappers that run the hook pipeline. Every operation is transaction-aware,
runs repository hooks, and wraps opaque driver errors in
`RepositoryQueryException`. Purpose-built `RuntimeException` subclasses such
as `OptimisticLockException` propagate unwrapped so callers can catch them
by type.

### Methods

| Category | Method | Signature |
| --- | --- | --- |
| Query | `find` | `(options?) => Promise<Entity[]>` |
| Query | `findOne` | `(options) => Promise<Entity \| null>` |
| Query | `count` | `(options?) => Promise<number>` |
| Query | `findAndCount` | `(options?) => Promise<[Entity[], number]>` |
| Create | `create` | `(entity, options?) => Promise<Entity>` |
| Create | `createMany` | `(entities, options?) => Promise<Entity[]>` |
| Update | `update` | `(entity, data, options?) => Promise<Entity>` |
| Update | `upsert` | `(entity, options?) => Promise<Entity>` |
| Update | `replace` | `(entity, data, options?) => Promise<Entity>` |
| Delete | `delete` | `(entity, options?) => Promise<Entity>` |
| Delete | `deleteMany` | `(entities, options?) => Promise<Entity[]>` |
| Delete | `softDelete` | `(entity, options?) => Promise<Entity>` |
| Lifecycle | `restore` | `(entity, options?) => Promise<Entity>` |
| Utility | `transform` | `(entityLike) => Entity` |
| Utility | `merge` | `(mergeIntoEntity, ...entityLikes) => Entity` |
| Utility | `prepare` | `(dto) => Entity \| undefined` |

All query and mutation methods accept an `options` parameter that includes
an optional `ctx` (repository context) for transaction and hook support.

### Optimistic Locking

`update`/`replace` automatically enforce optimistic locking whenever the
target entity carries a TypeORM `@VersionColumn` — which includes every
entity extending `AuditPostgresEntity`, `AuditSqliteEntity`,
`CommonPostgresEntity`, or `CommonSqliteEntity` (see
[Base Entities](#base-entities)), plus any entity that declares one itself.
The check derives entirely from the `entity` argument the caller already
passes in: its version is compared, atomically, against the row's current
version at write time, and a stale write — one based on an `entity` fetched
before someone else already updated it — is rejected with
`OptimisticLockException` (HTTP 409) instead of silently overwriting the
concurrent change. No extra API surface and no opt-in required, but two
behaviors do change for versioned entities. First, the write is applied to
a freshly re-read row rather than to the `entity` you passed: your `entity`
instance is no longer mutated in place, the returned entity is a different
object with no relations loaded, and any in-memory changes you made to
`entity` that aren't also in `data` are discarded — read the result back
from the return value. Second, because the guard runs inside a
`TransactionScope.run()` (see below), a conflict dooms the enclosing
transaction — catching `OptimisticLockException` and continuing does not
rescue it; retry the whole transaction from outside, re-reading the entity
first.

The check runs inside a transaction, opening one scoped to just that call
if the caller isn't already inside one (e.g. via `@Transactional()`), so a
third writer can't interleave between the version check and the field
write — **when `RepositoryModule.forRoot()` is imported**, since it's the
one that provides `TransactionScope`. If `TypeOrmRepositoryModule` is used
directly without it (see [Module Registration](#module-registration)) and
the caller isn't already inside their own active transaction, `update`/
`replace` on a versioned entity throws immediately — a `RuntimeException`
whose message names the entity and points at `RepositoryModule.forRoot()` —
rather than silently running the guard and the write as two separate,
unprotected statements. This is a configuration error surfaced at call
time, not a runtime conflict; it is not an `OptimisticLockException`.

### Soft-Deleted Immutability

`update`, `replace`, and `upsert` reject a soft-deleted target with
`SoftDeletedImmutableException` (HTTP 409) — enforced once in
`RepositoryAdapter` itself, so this driver has no separate opt-out logic to
maintain. See [nestjs-repository's Soft-Deleted Immutability
section](../nestjs-repository/README.md#soft-deleted-immutability) for the
`{ force: true }` escape hatch and the `softDelete()` no-op behavior.
A version value supplied by the caller in `data` is always ignored — only
the version read from the `entity` argument, and the row's own
auto-incrementing column, ever determine the real version.

Entities without a version column are unaffected — `update`/`replace`
behave exactly as before.

### Transaction Awareness

When a `PlainLiteralObject` context with an active `trx` is provided,
`TypeOrmRepository` automatically:

1. Resolves the TypeORM transaction via `ctx.trx.getOrStart(transactionKey)`
2. Uses the transactional `EntityManager` for all operations

## WhereClause Translation

`TypeOrmRepository` translates the ORM-agnostic `WhereClause` AST from
`@concepta/nestjs-repository` into TypeORM `FindOptionsWhere` objects.

### Supported Operators

| WhereOperator | TypeORM Translation | Description |
| --- | --- | --- |
| `eq` | `Equal(value)` | Equal |
| `ne` | `Not(Equal(value))` | Not equal |
| `gt` | `MoreThan(value)` | Greater than |
| `gte` | `MoreThanOrEqual(value)` | Greater than or equal |
| `lt` | `LessThan(value)` | Less than |
| `lte` | `LessThanOrEqual(value)` | Less than or equal |
| `contains` | `Like('%value%')` | Contains substring |
| `ncontains` | `Not(Like('%value%'))` | Does not contain substring |
| `starts` | `Like('value%')` | Starts with |
| `nstarts` | `Not(Like('value%'))` | Does not start with |
| `ends` | `Like('%value')` | Ends with |
| `nends` | `Not(Like('%value'))` | Does not end with |
| `in` | `In(values)` | In array |
| `nin` | `Not(In(values))` | Not in array |
| `null` | `IsNull()` | Is null |
| `nnull` | `Not(IsNull())` | Is not null |
| `between` | `Between(from, to)` | Between range |

### Compound Operators

| Operator | Description |
| --- | --- |
| `and` | All conditions must match |
| `or` | Any condition must match |

### Using the Where Builder

The `Where` helper from `@concepta/nestjs-repository` builds `WhereClause`
objects that `TypeOrmRepository` translates automatically:

```ts
import { Where } from '@concepta/nestjs-repository';

// Static API
const orders = await orderRepo.find(
  Where.where(
    Where.and(
      Where.eq<OrderEntity>('status', 'active'),
      Where.gt<OrderEntity>('total', 100),
    ),
  ),
);

// Typed builder API
const w = Where.for<OrderEntity>();
const orders = await orderRepo.find(
  w.where(
    w.and(
      w.eq('status', 'active'),
      w.or(
        w.gte('total', 1000),
        w.contains('notes', 'priority'),
      ),
    ),
  ),
);
```

### Translation Process

1. The `WhereClause` AST is flattened into Disjunctive Normal Form (DNF)
   using `toDnf()` from `RepositoryAdapter`
2. Each AND-branch is translated to a TypeORM `FindOptionsWhere` object
3. Same-field conditions within a branch are merged using TypeORM `And()`
4. The resulting array of `FindOptionsWhere` objects represents the OR
   of all branches

## Transaction Support

This module provides `TypeOrmTransaction` and `TypeOrmTransactionFactory`
for integration with `@concepta/nestjs-repository`'s transaction layer.

### TypeOrmTransaction

Wraps a TypeORM `QueryRunner` to manage transaction lifecycle:

```ts
const tx = new TypeOrmTransaction(dataSource);
await tx.start();

const manager = tx.getClient<EntityManager>();
await manager.save(entity);

await tx.commit();
```

| Property / Method | Description |
| --- | --- |
| `isActive` | Whether the transaction is currently active |
| `start()` | Create a QueryRunner and begin a transaction |
| `commit()` | Commit the transaction and release the QueryRunner |
| `rollback()` | Rollback the transaction and release the QueryRunner |
| `getClient<T>()` | Get the transactional `EntityManager` |

### TypeOrmTransactionFactory

Factory for creating `TypeOrmTransaction` instances. Automatically registered
with the `TransactionFactoryRegistry` when using `RepositoryModule.forFeature()`.

The transaction key follows the pattern `typeorm:<dataSourceName>` (e.g.,
`typeorm:default`).

### Automatic Transaction Integration

When `TypeOrmRepositoryModule` is used via `RepositoryModule.forFeature()`,
transaction factories are registered automatically. The `TypeOrmRepository`
joins transactions from the context:

```ts
import { TransactionScope } from '@concepta/nestjs-repository';

@Injectable()
export class OrderService {
  constructor(
    private readonly txScope: TransactionScope,
    @InjectDynamicRepository('orders')
    private readonly orderRepo: TypeOrmRepository<OrderEntity>,
  ) {}

  async createOrder(ctx: PlainLiteralObject, dto: DeepPartial<OrderEntity>) {
    return this.txScope.run(ctx, async (txCtx) => {
      // TypeOrmRepository automatically uses the transactional EntityManager
      return this.orderRepo.create(dto, { ctx: txCtx });
    });
  }
}
```

## Repository Hooks

`TypeOrmRepository` runs repository hooks from `@concepta/nestjs-repository`
at each operation lifecycle stage. Both high-level semantic hooks and
fine-grained hooks fire automatically.

| Operation | Before Hooks | After Hooks |
| --- | --- | --- |
| `find` | `beforeRead` -> `beforeFind` | `afterFind` -> `afterRead` |
| `findOne` | `beforeRead` -> `beforeFindOne` | `afterFindOne` -> `afterRead` |
| `count` | `beforeRead` -> `beforeCount` | `afterCount` |
| `findAndCount` | `beforeRead` -> `beforeFindAndCount` | `afterFindAndCount` |
| `create` | `beforeWrite` -> `beforeCreate` | `afterCreate` -> `afterWrite` |
| `createMany` | `beforeWrite` -> `beforeCreateMany` | `afterCreateMany` -> `afterWrite` |
| `update` | `beforeWrite` -> `beforeUpdate` | `afterUpdate` -> `afterWrite` |
| `upsert` | `beforeWrite` -> `beforeUpsert` | `afterUpsert` -> `afterWrite` |
| `replace` | `beforeWrite` -> `beforeReplace` | `afterReplace` -> `afterWrite` |
| `delete` | `beforeDestroy` -> `beforeDelete` | `afterDelete` -> `afterDestroy` |
| `deleteMany` | `beforeDestroy` -> `beforeDeleteMany` | `afterDeleteMany` -> `afterDestroy` |
| `softDelete` | `beforeTransition` -> `beforeSoftDelete` | `afterSoftDelete` -> `afterTransition` |
| `restore` | `beforeTransition` -> `beforeRestore` | `afterRestore` -> `afterTransition` |

Hooks are resolved via `HookResolverService` from `@concepta/nestjs-core`.
The hook resolver is optional -- `TypeOrmRepository` works without it.

## Base Entities

The module provides abstract base entities for Postgres and SQLite with
audit fields and optimistic locking.

### Core Base Entities

| Entity | Database | Extends | Key Fields |
| --- | --- | --- | --- |
| `AuditPostgresEntity` | Postgres | -- | dateCreated, dateUpdated, dateDeleted (`timestamptz`), version |
| `AuditSqliteEntity` | SQLite | -- | dateCreated, dateUpdated, dateDeleted, version |
| `CommonPostgresEntity` | Postgres | `AuditPostgresEntity` | id (UUID primary key) |
| `CommonSqliteEntity` | SQLite | `AuditSqliteEntity` | id (UUID primary key) |

`AuditPostgresEntity` uses `@CreateDateColumn`, `@UpdateDateColumn`,
`@DeleteDateColumn` (for soft deletes), and `@VersionColumn` (for
optimistic locking). The Postgres variant uses `timestamptz` column types.

### Using Base Entities

```ts
import { Entity, Column } from 'typeorm';
import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm';

@Entity()
export class OrderEntity extends CommonPostgresEntity {
  @Column()
  status!: string;

  @Column('uuid')
  customerId!: string;
}
```

This gives `OrderEntity` the `id`, `dateCreated`, `dateUpdated`,
`dateDeleted`, and `version` fields automatically.

## Exceptions

| Exception | Package | Description |
| --- | --- | --- |
| `RepositoryQueryException` | `@concepta/nestjs-repository` | Repository query error (wraps original error) |
| `OptimisticLockException` | `@concepta/nestjs-repository` | An `update`/`replace` targeted a stale version — see [Optimistic Locking](#optimistic-locking) |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-repository-typeorm` | `TypeOrmRepositoryModule`, `TypeOrmRepository`, `TypeOrmProviderOptionsInterface`, `TypeOrmTransaction`, `TypeOrmTransactionFactory`, `AuditPostgresEntity`, `AuditSqliteEntity`, `CommonPostgresEntity`, `CommonSqliteEntity` |
