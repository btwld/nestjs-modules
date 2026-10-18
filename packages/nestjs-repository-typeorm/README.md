# @concepta/nestjs-repository-typeorm

TypeORM driver for `@concepta/nestjs-repository`. Provides `TypeOrmRepository`
(extending `RepositoryAdapter`), `TypeOrmTransaction` / `TypeOrmTransactionFactory`
for automatic transaction management, WhereClause-to-TypeORM translation, and
database-specific base entities for Postgres and SQLite.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-repository-typeorm)](https://www.npmjs.com/package/@concepta/nestjs-repository-typeorm)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-repository-typeorm)](https://www.npmjs.com/package/@concepta/nestjs-repository-typeorm)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-repository-typeorm%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

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

SQL databases only. A repository registered on a MongoDB data source fails at
startup.

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
| `typeorm` | Yes | TypeORM `^0.3.31 \|\| ~1.0.0`. 1.1+ is not yet supported: it counts distinct values of the selected columns when find options carry a `select`, which changes what a projected paginated query reports as its total |

## Module Registration

List `TypeOrmRepositoryModule` as a driver in `RepositoryModule.forRoot()`,
with the entities it serves:

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
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [
            { key: 'orders', entity: OrderEntity },
            { key: 'customers', entity: CustomerEntity, dataSource: 'secondary' },
            { key: 'audit', entity: AuditLog, factory: createAuditRepository },
          ],
        },
      ],
    }),
  ],
})
export class AppModule {}
```

Each entity key creates a `TypeOrmRepository`. Import
`RepositoryModule.forFeature(['orders'])` in a module to inject it there with
`@InjectDynamicRepository('orders')`.

### Provider Options

```ts
interface TypeOrmProviderOptionsInterface<Entity> extends RepositoryProviderOptions<Entity> {
  key: string;                                             // Injection key
  entity: Type<Entity>;                                    // TypeORM entity class
  dataSource?: TypeOrmDataSourceToken;                     // Data source (default: 'default')
  factory?: (dataSource: DataSource) => Repository<Entity>; // Custom repository factory
  relations?: Record<string, RelationConfig>;              // Per-relation federation settings
  rowScope?: RowScopeRegistration;                         // Declarations, bound by forRoot()
  writePolicy?: WritePolicyRegistration;
  allowEagerRelations?: boolean;
  hooks?: HookOption[];
}
```

- **`key`** -- string key used with `@InjectDynamicRepository(key)`
- **`entity`** -- TypeORM entity class
- **`dataSource`** -- optional data source name, `DataSource` instance, or
  `DataSourceOptions`; defaults to `'default'`
- **`factory`** -- optional factory for custom TypeORM repositories; receives
  `DataSource`, returns `Repository<Entity>`
- **`relations`**, **`rowScope`**, **`writePolicy`**, **`allowEagerRelations`**,
  **`hooks`** -- the entity's declarations, including which relations are
  federated. Read and bound by `RepositoryModule.forRoot()`; this driver
  ignores them

A federated relation into an entity on another data source still needs that
entity in its own data source's `entities`, since TypeORM resolves a relation
only within one data source. Its rows are read from the other data source,
through the repository registered for it.

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
write.

A version value supplied by the caller in `data` is always ignored — only
the version read from the `entity` argument, and the row's own
auto-incrementing column, ever determine the real version. This is
distinct from `options.expectedVersion`, below, which the caller *does*
control.

Every guarded write stamps your `@UpdateDateColumn`, even an update whose
`data` changes nothing (its version stays the same). Your subscribers'
`beforeUpdate`/`afterUpdate` also run one extra time per guarded write,
with only the version in `event.entity` and no `databaseEntity`.
`@BeforeUpdate`/`@AfterUpdate` methods on the entity don't run that extra
time.

### Expected Version (cross-request optimistic locking)

The check above guards a read-then-write inside one request; it can't stop
two requests that each re-read before writing, since each compares against
its own fresh value. Passing `expectedVersion` in `options` (see
[nestjs-repository's Expected Version
section](../nestjs-repository/README.md#expected-version)) extends the
same atomic compare-and-swap mechanism to `delete`, `softDelete`, and
`restore` as well — but, unlike `update`/`replace`, only when the caller
actually supplies one. That's what keeps this non-breaking: an existing
caller of those three methods that never passes `expectedVersion` inherits
no new transaction requirement.

This driver never decides *whether* a guard applies or *what* value to
check — `RepositoryAdapter` resolves that into a `RepositoryVersionGuardInterface`
descriptor and hands it down as `options.versionGuard`; the driver's only
job is running the atomic `UPDATE ... WHERE <column> = <value>` probe
against whatever descriptor it's given.

Two caveats carried over from the in-request check: on MySQL, the probe
relies on `affected` reflecting rows *matched*, not rows *changed* — true
by default for Postgres and sqlite, but on MySQL only with
`CLIENT_FOUND_ROWS` enabled, so an entity with no other auto-updating
column (e.g. no `@UpdateDateColumn`) can see a false conflict without it.
Note how `expectedVersion` interacts with the idempotent `softDelete` of an
already-soft-deleted row: the guard is resolved *before* the no-op, so a
**stale** version conflicts with `OptimisticLockException` instead of quietly
succeeding, while a **matching** version still no-ops — the driver is never
reached either way, so its CAS does not run on that path. The idempotency
guarantee is preserved; what `expectedVersion` adds is that a stale
precondition against a row someone else already deleted is reported rather
than swallowed. (Unreachable over HTTP anyway: `nestjs-crud`'s `getOneOrFail`
re-reads with `withDeleted: false` before a soft-delete, so an
already-soft-deleted row 404s first.)

### Soft-Deleted Immutability

`update`, `replace`, and `upsert` reject a soft-deleted target with
`SoftDeletedImmutableException` (HTTP 409) — enforced once in
`RepositoryAdapter` itself, so this driver has no separate opt-out logic to
maintain. See [nestjs-repository's Soft-Deleted Immutability
section](../nestjs-repository/README.md#soft-deleted-immutability) for the
`softDelete()` no-op behavior.

This guard depends only on the delete-date column, so it applies to entities
with no version column too.

### Eager Relations

A relation declared with `eager: true` loads only for a repository registered
with `allowEagerRelations: true` (see
[What a result holds](../nestjs-repository/README.md#what-a-result-holds)).
The rows its reads return then hold each eager relation, which may hold only its
own columns: an eager relation nested inside another one throws. Without the
opt-in, a row holds only the relations its read joined.

### TypeORM Features at Your Own Risk

TypeORM behaviour you declare on an entity runs outside the repository's
guarantees: row scope, write policy and hooks never see what it does.

- **Entity listeners and subscribers** (`@BeforeInsert`, `@AfterLoad`,
  `EntitySubscriberInterface`, …) run on every write and on every read that
  returns rows. A value a listener sets reaches the database unchecked, and a
  subscriber can write other tables without going through their repositories.
  Don't add a property that is not a column: depending on the call, it is
  dropped from the result or makes the call throw `RepositoryQueryException`.
- **Write listeners** (`@BeforeInsert`, `@AfterUpdate`, …) receive an entity
  the driver built without running its constructor, so they can't rely on
  state the constructor sets, and reading an ES `#private` field throws.
- **`cascade`** has nothing to act on. A write payload holds no relations (see
  [Writing relations](../nestjs-repository/README.md#writing-relations)) and
  only the entity's own columns reach TypeORM, so nothing cascades. `onDelete`
  actions on a relation are the database's, and still apply.
- **Closure-table, nested-set and materialized-path trees** (`@Tree`) are not
  kept. The entity starts only with the `@TreeParent` key declared as a column
  of its own, and a write sets that column. TypeORM finds a row's parent only
  through the `@TreeParent` relation, though, which a repository write never
  carries, so a new row is filed as a root (a nested set refuses a second
  one) and a changed parent key leaves the tree as it was.

### Joins and Foreign Key Constraints

Joining a relation adds the related row to each result and never changes which
rows come back or the total.

The one exception is a required relation (`nullable: false`) declared with
`createForeignKeyConstraints: false`: its key can point at a row that no longer
exists, and joining it may then drop such rows from the result and the total.
Keep the constraint, or treat the relation as your own risk.

### Row Scope and Shared Tables

A table can be registered once. Entities that read the same table, such as
single-table inheritance children and their parent, can't both be registered,
and a relation into any of them is checked like a relation into the registered
one. A table is matched by its database and name, whichever data source reaches
it and whatever schema it is in.

That matching errs on the safe side: tables with the same name in two schemas,
or in two databases with the same name on different servers, count as one.

Two cases read a table without matching it, so give them a row scope yourself
when the table is scoped:

- a view entity over the table;
- a SQLite file reached through two different paths (`./app.sqlite` and an
  absolute path to the same file).

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
| `contains` | `Raw(LIKE '%value%' ESCAPE '!')` | Contains substring |
| `ncontains` | `Not(Raw(LIKE '%value%' ESCAPE '!'))` | Does not contain substring |
| `starts` | `Raw(LIKE 'value%' ESCAPE '!')` | Starts with |
| `nstarts` | `Not(Raw(LIKE 'value%' ESCAPE '!'))` | Does not start with |
| `ends` | `Raw(LIKE '%value' ESCAPE '!')` | Ends with |
| `nends` | `Not(Raw(LIKE '%value' ESCAPE '!'))` | Does not end with |
| `in` | `In(values)` | In array |
| `nin` | `Not(In(values))` | Not in array |
| `null` | `IsNull()` | Is null |
| `nnull` | `Not(IsNull())` | Is not null |
| `between` | `Between(from, to)` | Between range |

### Text Matching

The text operators match your value as written: `Where.contains('code', '50%')`
finds codes containing `50%`, and `_` matches only an underscore.

Whether case matters is your database's decision:

| Database | `Where.contains('name', 'ali')` matches `Alice` |
| --- | --- |
| PostgreSQL | No |
| SQLite | Yes, for ASCII letters |
| MySQL / MariaDB | Depends on the column's collation; yes with the default collations |

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
with the `TransactionFactoryRegistry` by `RepositoryModule.forRoot()`.

The transaction key follows the pattern `typeorm:<dataSourceName>` (e.g.,
`typeorm:default`).

### Single-Connection Drivers

TypeORM hands out one shared `QueryRunner` per `DataSource` for `sqlite`,
`better-sqlite3`, `sqljs`, `expo`, `capacitor`, `cordova`, `nativescript`, and
`react-native` — unlike `postgres`, which gives each transaction its own
connection. Two transactions started concurrently on one of these drivers
would otherwise both try to `BEGIN` on the same connection, and the second
fails with a driver-level error instead of running the version guard.

`TypeOrmTransactionFactory` declares
`supportsConcurrentTransactions: false` for these drivers, which makes
`TransactionManager` queue transactions for that data source: a second,
independent `TransactionScope.run()` (or a versioned `update`/`replace`,
which opens one) on the same data source waits for the first to commit or
roll back rather than racing it — a nested/joining `run()` on the same scope
shares the already-started transaction and never waits. A real conflict
still surfaces as `OptimisticLockException`; it just can't be mistaken for a
driver error anymore. This trades write concurrency for correctness on that
data source: transactions against it run one at a time, so its throughput is
bounded by the longest-running scope rather than by the connection pool it
doesn't have.

### Automatic Transaction Integration

`RepositoryModule.forRoot()` registers a transaction factory for each data
source your entities use. The `TypeOrmRepository`
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

### Append-Only Base Entities

For an entity registered with an append-only `writePolicy` (see Write Policy
in the `@concepta/nestjs-repository` README), extend `AppendOnlyPostgresEntity`
or `AppendOnlySqliteEntity` instead. Each has a generated UUID `id` and
`dateCreated`, and nothing that implies a row can change. The `Audit*` and
`Common*` entities are refused at startup on an append-only entity, because
their `dateDeleted` column could never be set.

```ts
import { Entity, Column } from 'typeorm';
import { AppendOnlyPostgresEntity } from '@concepta/nestjs-repository-typeorm';

@Entity()
export class StatementItemEntity extends AppendOnlyPostgresEntity {
  @Column()
  amount!: string;
}
```

Never take the `id` from the request; an id the application generates is
fine. Two concurrent creates with the same request-supplied `id` can both
pass `create`'s existence check, and the second can overwrite the first.

To let each record be corrected only once (see
[Correcting an append-only record](../nestjs-repository/README.md#correcting-an-append-only-record)),
give `correctedId` a unique index and a self-referencing foreign key:

```ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppendOnlyPostgresEntity } from '@concepta/nestjs-repository-typeorm';

@Entity()
@Index(['correctedId'], { unique: true })
export class StatementItem extends AppendOnlyPostgresEntity {
  @Column({ type: 'uuid', nullable: true })
  correctedId!: string | null;

  @ManyToOne(() => StatementItem, { nullable: true })
  @JoinColumn({ name: 'correctedId' })
  corrected?: StatementItem | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  // amount, currency, …
}
```

`NULL`s are distinct in a unique index on Postgres and SQLite, so originals
coexist while a second correction of one record is refused.

## Exceptions

| Exception | Package | Description |
| --- | --- | --- |
| `RepositoryQueryException` | `@concepta/nestjs-repository` | Repository query error (wraps original error) |
| `RepositoryDatabaseException` | `@concepta/nestjs-repository` | A query the database failed. `context.database` is the data source `type` (`postgres`, `better-sqlite3`); `context.code` is the database client's `code`, or its `errno` when it has no `code` |
| `OptimisticLockException` | `@concepta/nestjs-repository` | An `update`, `replace`, `delete`, `softDelete` or `restore` targeted a stale version — see [Optimistic Locking](#optimistic-locking) |
| `SoftDeletedImmutableException` | `@concepta/nestjs-repository` | A write targeted a soft-deleted row — see [Soft-Deleted Immutability](#soft-deleted-immutability) |
| `EntityAlreadyExistsException` | `@concepta/nestjs-repository` | A `create` supplied a primary key that already names a row |
| `PartialPrimaryKeyException` | `@concepta/nestjs-repository` | A `create` supplied only part of a composite primary key |
| `PrimaryKeyImmutableException` | `@concepta/nestjs-repository` | An `update`/`replace` carried data that would change the primary key |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-repository-typeorm` | `TypeOrmRepositoryModule`, `TypeOrmRepository`, `TypeOrmProviderOptionsInterface`, `TypeOrmTransaction`, `TypeOrmTransactionFactory`, `AuditPostgresEntity`, `AuditSqliteEntity`, `CommonPostgresEntity`, `CommonSqliteEntity`, `AppendOnlyPostgresEntity`, `AppendOnlySqliteEntity` |
