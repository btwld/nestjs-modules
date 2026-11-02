# @concepta/nestjs-repository-typeorm

TypeORM driver for `@concepta/nestjs-repository`. Import the adapter for your
database (`/postgres`, `/mysql`, `/mariadb`, `/oracle`, `/sqlserver` or
`/sqlite`): it gives you a module to register your entities with,
repositories that run on your data source's transactions, and base entities
with audit columns and a version.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-repository-typeorm)](https://www.npmjs.com/package/@concepta/nestjs-repository-typeorm)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-repository-typeorm)](https://www.npmjs.com/package/@concepta/nestjs-repository-typeorm)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-repository-typeorm%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Choose Your Adapter](#choose-your-adapter)
- [Module Registration](#module-registration)
- [TypeOrmRepository](#typeormrepository)
- [WhereClause Translation](#whereclause-translation)
- [Transaction Support](#transaction-support)
- [Row-Level Security (Postgres)](#row-level-security-postgres)
- [Virtual Private Database (Oracle)](#virtual-private-database-oracle)
- [Repository Hooks](#repository-hooks)
- [Base Entities](#base-entities)
- [Durable Messaging](#durable-messaging)
- [Exceptions](#exceptions)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-repository-typeorm @nestjs/common @nestjs/core typeorm pg
```

Replace `pg` with your database's client from
[Choose Your Adapter](#choose-your-adapter).

### Requirements

ESM-only — no CJS build is published. Requires Node `>= 22.12` and
NestJS 12.

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common`, `@nestjs/core` | Yes | NestJS 12 |
| `typeorm` | Yes | `^0.3.31 \|\| ~1.0.0`. 1.1+ isn't supported yet: it miscounts the total of a paginated read that has a `select` |
| `@nestjs/outbox` | No | Only for [Durable Messaging](#durable-messaging) |

## Choose Your Adapter

| Database | Client | Import from | Register | Extend |
| --- | --- | --- | --- | --- |
| Postgres 16 | `pg` | `@concepta/nestjs-repository-typeorm/postgres` | `TypeOrmPostgresRepositoryModule` | `CommonPostgresEntity`, … |
| MySQL 8.4 | `mysql2` | `@concepta/nestjs-repository-typeorm/mysql` | `TypeOrmMysqlRepositoryModule` | `CommonMysqlEntity`, … |
| MariaDB 11.4 | `mysql2` | `@concepta/nestjs-repository-typeorm/mariadb` | `TypeOrmMariadbRepositoryModule` | `CommonMariadbEntity`, … |
| Oracle 23ai | `oracledb` | `@concepta/nestjs-repository-typeorm/oracle` | `TypeOrmOracleRepositoryModule` | `CommonOracleEntity`, … |
| SQL Server 2025 | `mssql` | `@concepta/nestjs-repository-typeorm/sqlserver` | `TypeOrmSqlServerRepositoryModule` | `CommonSqlServerEntity`, … |
| SQLite | `better-sqlite3` | `@concepta/nestjs-repository-typeorm/sqlite` | `TypeOrmSqliteRepositoryModule` | `CommonSqliteEntity`, … |

The sections below list what differs per database; everything else in this
README applies to all six. An entity registered on a data source of another
database stops startup with `TypeOrmUnsupportedDatabaseException`.

### Postgres

- Dates round-trip exactly; no time-zone setting is needed.
- `Where.contains('name', 'ali')` doesn't match `Alice`: text matching is
  case-sensitive.
- In ascending order, `NULL`s sort last.
- Transactions run concurrently, each on its own connection.
- `transactionSettings` sets values at the start of every transaction, such
  as the caller's tenant — see
  [Row-Level Security (Postgres)](#row-level-security-postgres).
- [Durable messaging](#durable-messaging): supported.

### MySQL

- Keep the client's default flags. Versioned writes rely on `FOUND_ROWS`,
  so a data source that turns it off (`flags` or `extra.flags` holding
  `'-FOUND_ROWS'`) stops startup with `TypeOrmMysqlFoundRowsException`.
- Run the server in UTC and set `timezone: 'Z'` on the data source.
  Otherwise dates the database fills in, like `dateCreated`, come back
  shifted by your host's UTC offset.
- Whether text matching ignores case depends on the column's collation; the
  default collations ignore it.
- In ascending order, `NULL`s sort first.
- Transactions run concurrently, each on its own connection.
- [Durable messaging](#durable-messaging): supported.

### MariaDB

MariaDB works like [MySQL](#mysql), flags, `timezone`, collations and
[durable messaging](#durable-messaging) included. The outbox store needs
MariaDB 11.4.7 or later and refuses an earlier one at startup; for later
MariaDB versions, see the
[`@nestjs/outbox` README](https://www.npmjs.com/package/@nestjs/outbox).

### Oracle

Uses the `oracledb` client in its default Thin mode.

- Oracle stores an empty string as `NULL`: `create({ note: '' })` reads back
  `note: null`, and `''` in a `NOT NULL` column fails the write.
- Leave `useUTC` off: with the defaults, every date round-trips exactly.
  `useUTC: true` sets the session time zone for the whole process, and then
  dates the database fills in on a `timestamp` column, and dates you write to
  a `timestamp with time zone` column (like the activity entities'
  `occurredAt`), come back shifted by your host's UTC offset.
- Declare booleans as `@Column()` on a `boolean` property (stored as
  `number`); TypeORM refuses `type: 'boolean'` on Oracle.
- `Where.contains('name', 'ali')` doesn't match `Alice`: text matching is
  case-sensitive.
- In ascending order, `NULL`s sort last.
- `createMany` inserts one row per statement.
- Transactions run concurrently, each on its own connection.
- `applicationContext` sets values at the start of every transaction, such
  as the caller's tenant — see
  [Virtual Private Database (Oracle)](#virtual-private-database-oracle).
- [Durable messaging](#durable-messaging): refused at startup.

### SQL Server

- Run the server in UTC (the Linux image's default) and set
  `options: { useUTC: true }` on the data source. The database fills in
  dates like `dateCreated` from its own clock, with no offset, so on a
  server in another time zone they're off by its offset. Without `useUTC`,
  dates on a `datetime2` or `datetime` column (TypeORM's types for the date
  columns and for a `Date` property) also come back shifted by your host's
  offset; the base entities' `datetimeoffset` columns don't.
- `Where.contains('name', 'ali')` matches `Alice`: with the default
  collation, text matching ignores case, and so do unique keys (`'P'` and
  `'p'` collide).
- In ascending order, `NULL`s sort first.
- A unique index allows only one `NULL`. For a nullable unique column, give
  the index a filter: `@Index(['correctedId'], { unique: true, where:
  '"correctedId" IS NOT NULL' })`.
- Generated UUIDs come back in upper case; comparisons ignore case, so a
  lower-case id still finds its row.
- `context.code` on a `RepositoryDatabaseException` is SQL Server's error
  number: `2627` or `2601` for a duplicate key (constraint or unique index),
  `547` for a foreign key, `515` for a missing value.
- Transactions run concurrently, each on its own connection.
- No option sets `SESSION_CONTEXT` per transaction, so SQL Server's own
  row-level security can't see the caller's tenant.
- [Durable messaging](#durable-messaging): refused at startup.

### SQLite

Use the `better-sqlite3` driver; a `sqlite` data source stops startup with
`TypeOrmUnsupportedDatabaseException`.

- Dates round-trip exactly; no time-zone setting is needed.
- `Where.contains('name', 'ali')` matches `Alice`: text matching ignores
  case for ASCII letters.
- In ascending order, `NULL`s sort first.
- Transactions run one at a time. A data source has one connection, so a
  second `TransactionScope.run()` (or a versioned `update` or `replace`,
  which opens one) waits for the first to commit or roll back. A nested
  `run()` joins the transaction already open and never waits. Throughput on
  that data source is bounded by its longest-running transaction.
- [Durable messaging](#durable-messaging): refused at startup.

## Module Registration

List your adapter's module as a driver in `RepositoryModule.forRoot()`, with
the entities it serves:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmPostgresRepositoryModule } from '@concepta/nestjs-repository-typeorm/postgres';

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
          driver: TypeOrmPostgresRepositoryModule,
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

Each entity key gets a repository from your adapter
(`TypeOrmPostgresRepository`, …); inject it typed as `TypeOrmRepository`.
Import `RepositoryModule.forFeature(['orders'])` in a module to inject it
there with `@InjectDynamicRepository('orders')`.

### Provider Options

```ts
interface TypeOrmProviderOptionsInterface<Entity> extends RepositoryProviderOptions<Entity> {
  key: string;                                             // Injection key
  entity: Type<Entity>;                                    // TypeORM entity class
  dataSource?: TypeOrmDataSourceToken;                     // Data source (default: 'default')
  factory?: (dataSource: DataSource) => Repository<Entity>; // Custom repository factory
  relations?: Record<string, RelationConfig>;              // Per-relation settings (cascade, …)
  rowScope?: RowScopeRegistration;                         // Declarations, bound by forRoot()
  writePolicy?: WritePolicyRegistration;
  activity?: ActivityRegistration;
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
- **`relations`**, **`rowScope`**, **`writePolicy`**, **`activity`**,
  **`allowEagerRelations`**, **`hooks`** -- the entity's declarations, read
  by `RepositoryModule.forRoot()`; the driver ignores them

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

Every method runs in the caller's transaction, runs repository hooks, and
throws `RepositoryQueryException` for a driver error it can't describe.
Typed exceptions such as `OptimisticLockException` reach you unwrapped, so
catch them by type.

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

`update` and `replace` on an entity with a `@VersionColumn` (every `Audit*`
and `Common*` entity) reject a stale `entity` with `OptimisticLockException`
(409). The call runs in a transaction, opening one if needed.

- Use the return value: it is a fresh object with no relations, and changes
  to `entity` that aren't in `data` are dropped.
- A conflict dooms the enclosing transaction, so retry the whole transaction
  from outside, after re-reading.
- A version in `data` is ignored; pass `expectedVersion` (below) instead.

### Expected Version (cross-request optimistic locking)

Pass `expectedVersion` in `options` to check the version a client saw, across
requests (see
[Expected Version](../nestjs-repository/README.md#expected-version)). It also
guards `delete`, `softDelete` and `restore`, only when you pass it. On a row
that is already soft-deleted, a stale `expectedVersion` throws
`OptimisticLockException`, and a matching one is a no-op.

### Soft-Deleted Immutability

`update`, `replace` and `upsert` reject a soft-deleted row with
`SoftDeletedImmutableException` (409), with or without a version column. See
[Soft-Deleted Immutability](../nestjs-repository/README.md#soft-deleted-immutability)
for `softDelete()` on a row already deleted.

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
  Write listeners receive an entity built without running its constructor,
  so they can't rely on state the constructor sets, and reading an ES
  `#private` field throws.
- **`update` and `replace` of a versioned entity** stamp your
  `@UpdateDateColumn` even when `data` changes nothing. Your subscribers'
  `beforeUpdate`/`afterUpdate` run one extra time, with only the version in
  `event.entity` and no `databaseEntity`; the entity's own
  `@BeforeUpdate`/`@AfterUpdate` methods don't.
- **`update` and `replace` of an entity without a version column** write only
  the columns in `data`, with one `UPDATE` followed by a re-read in the same
  transaction, so a stale `entity` never overwrites a later writer's change.
  `@BeforeUpdate`/`@AfterUpdate` methods on the entity don't run for them;
  your subscribers' `beforeUpdate`/`afterUpdate` do, with only the written
  columns in `event.entity` and no `databaseEntity`.
- **`@Column({ insert: false })` and `@Column({ update: false })`** are
  honoured by TypeORM, not the repository: a value for such a column is
  dropped from a create or update without an error. An `update` or `replace`
  whose `data` names nothing else fails with `RepositoryQueryException`, since
  TypeORM is left with nothing to set.
- **TypeORM's `cascade`** on a relation decorator never fires: only the
  entity's own columns reach TypeORM. To write related rows with the entity,
  mark the relation `cascade: true` in `forRoot` (see
  [Writing relations](../nestjs-repository/README.md#writing-relations)).
  `onDelete` actions are the database's, and still apply.
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

### Joining Scoped Entities

Two entities scoped by `joinable` resolvers on the same columns can be joined
when the foreign key includes those columns. Declare the relation with a
composite foreign key, and make the referenced columns unique together:

```ts
@Entity()
@Unique(['tenantId', 'id'])
export class Order {
  @PrimaryGeneratedColumn() id!: number;
  @Column() tenantId!: string;
  @OneToMany(() => OrderLine, (line) => line.order) lines?: OrderLine[];
}

@Entity()
export class OrderLine {
  @PrimaryGeneratedColumn() id!: number;
  @Column() tenantId!: string;
  @Column() orderId!: number;

  @ManyToOne(() => Order, (order) => order.lines)
  @JoinColumn([
    { name: 'tenantId', referencedColumnName: 'tenantId' },
    { name: 'orderId', referencedColumnName: 'id' },
  ])
  order?: Order;
}
```

Both `order` and `lines` then report both column pairs, so either side can be
joined. See "Relations and row scope" in the `@concepta/nestjs-repository`
README.

## WhereClause Translation

Every `WhereClause` from `@concepta/nestjs-repository` translates.

### Supported Operators

| WhereOperator | Description |
| --- | --- |
| `eq` | Equal |
| `ne` | Not equal |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `contains` | Contains substring |
| `ncontains` | Does not contain substring |
| `starts` | Starts with |
| `nstarts` | Does not start with |
| `ends` | Ends with |
| `nends` | Does not end with |
| `in` | In array |
| `nin` | Not in array |
| `null` | Is null |
| `nnull` | Is not null |
| `between` | Between range |

### Text Matching

The text operators match your value as written: `Where.contains('code', '50%')`
finds codes containing `50%`, and `_` matches only an underscore.

Whether case matters is your database's decision — see
[Choose Your Adapter](#choose-your-adapter).

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

## Transaction Support

Each adapter provides a transaction and a transaction factory
(`TypeOrmPostgresTransaction`, `TypeOrmSqliteTransaction`, …). You don't
build these yourself: `RepositoryModule.forRoot()` registers a factory for
each data source your entities use, and `TransactionScope.run()` and
`@Transactional()` open transactions through it.

| Property / Method | Description |
| --- | --- |
| `isActive` | Whether the transaction is currently active |
| `start()` | Begin the transaction; on Postgres, apply its `transactionSettings`; on Oracle, set its `applicationContext` |
| `commit()` | Commit, then (on Oracle) clear its `applicationContext` values, and release the connection |
| `rollback()` | Roll back, then (on Oracle) clear its `applicationContext` values, and release the connection |
| `getClient()` | The transactional `EntityManager` |

The transaction key names the adapter and the data source:
`typeorm-postgres:<dataSourceName>`, `typeorm-mysql:<dataSourceName>`,
`typeorm-mariadb:<dataSourceName>`, `typeorm-oracle:<dataSourceName>`,
`typeorm-sqlserver:<dataSourceName>` or `typeorm-sqlite:<dataSourceName>`
(e.g., `typeorm-postgres:default`).

### Joining a Transaction

Pass the `ctx` from `TransactionScope.run()` or `@Transactional()` and the
call joins that transaction:

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
      return this.orderRepo.create(dto, { ctx: txCtx });
    });
  }
}
```

## Row-Level Security (Postgres)

Put Postgres row-level security behind row scope, and the database itself
hides other tenants' rows — even from raw SQL, reports, or a query someone
forgot to scope. Row scope stays the enforcement; RLS is the backstop.

You add one option, and the driver sets the caller's tenant at the start of
every transaction. The policies are a few lines of SQL in your migrations.

### Setting the tenant

Give the Postgres adapter a `transactionSettings` function. Every
transaction it opens starts by setting those values, read from the caller's
context.

```ts
import { RepositoryModule, RowScopeCtx } from '@concepta/nestjs-repository';
import { TypeOrmPostgresRepositoryModule } from '@concepta/nestjs-repository-typeorm/postgres';

RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmPostgresRepositoryModule,
      entities: [{ key: 'orders', entity: Order }],
      options: {
        transactionSettings: (ctx) => ({
          'app.tenant_id': ctx.supports(RowScopeCtx)
            ? ctx.with(RowScopeCtx).tenantId
            : undefined,
        }),
      },
    },
  ],
});
```

Read the tenant from the same `RowScopeCtx` overlay your row scope resolver
reads, so the two always agree on who the caller is. The second argument is
the data source name; return `{}` for one without policies. Only the
Postgres adapter takes the option.

Name each setting anything with a dot in it, and use the same name in your
policies. An `undefined` value is skipped.

What you get: each transaction the driver opens sets these values before any
of your queries run, with `set_config(name, value, true)`. That includes
`@Transactional()`, `TransactionScope.run()` and `runReadOnly()`, versioned
`update` and `replace`, and the transactions other Rockets modules open
themselves. The values end with the transaction, so the next request on a
pooled connection starts with none. If a setting fails, the transaction is
rolled back and you get the error.

### Policies

The policies, roles and table settings are your migrations. A recipe for one
tenant-scoped table:

```sql
-- Policies apply to the table owner too.
alter table orders enable row level security;
alter table orders force row level security;

-- An unset tenant matches no rows: reads return nothing, writes are refused.
-- Keep the nullif: on a reused connection an unset tenant reads '', not NULL.
create policy tenant_isolation on orders
  for all
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

-- The application connects as a role that owns nothing and can't bypass RLS.
create role app_user login password '...' nosuperuser nobypassrls;
grant select, insert, update, delete on orders to app_user;

-- Migrations and background jobs that work across tenants use their own role.
create role app_admin login password '...' bypassrls;
```

### Before you turn it on

- **Run every request in a transaction, reads included.** Use
  `@Transactional({ readOnly: true })` or `TransactionScope.runReadOnly()`
  for reads. Outside a transaction there is no tenant: reads return no rows,
  inserts are refused, and updates and deletes change nothing. Nothing
  reports it, so a forgotten `@Transactional()` looks like an empty result.
- **Pass `ctx` to every repository call.** Without it there is no tenant: the
  call matches no rows, and a versioned write fails with
  `OptimisticLockException`.
- **Keep per-user rules in row scope.** The policy covers the tenant only, so
  SQL that bypasses the repository sees every row in the caller's tenant.
- **Serve callers who read across tenants from the bypass role.** The policy
  still applies when `relax` lifts the tenant: such a caller reads only the
  tenant in their setting, or nothing without one.
- **Leave the outbox tables without a tenant policy.** The `@nestjs/outbox`
  relay and its migrations run outside the driver's transactions, so they
  never have a tenant.
- **Include `tenant_id` in foreign keys.** Postgres checks foreign keys
  without the policies, so otherwise a row can point into another tenant.
- **Create views with `security_invoker = true`.** Otherwise they run as
  their owner and skip the policies. `security definer` functions always do.
- **Code on the raw `DataSource`** runs outside the driver's transactions and
  has no tenant.

## Virtual Private Database (Oracle)

Oracle's Virtual Private Database (VPD) does on Oracle what
[row-level security](#row-level-security-postgres) does on Postgres: the
database hides other tenants' rows, even from SQL that bypasses the
repository. Row scope stays the enforcement; VPD is the backstop. VPD comes
with Oracle Enterprise Edition and Oracle Database Free, not Standard
Edition 2.

### Setting the tenant in an application context

A VPD policy reads the caller's tenant from an application context, which
only its own package can set. Give the Oracle adapter `applicationContext`:
that package's `procedure` and a `values` function. Every transaction it
opens starts by setting those values, read from the caller's context.

```ts
import { RepositoryModule, RowScopeCtx } from '@concepta/nestjs-repository';
import { TypeOrmOracleRepositoryModule } from '@concepta/nestjs-repository-typeorm/oracle';

RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmOracleRepositoryModule,
      entities: [{ key: 'orders', entity: Order }],
      options: {
        applicationContext: {
          procedure: 'app_owner.app_ctx_pkg.set_value',
          values: (ctx) => ({
            tenant_id: ctx.supports(RowScopeCtx)
              ? ctx.with(RowScopeCtx).tenantId
              : undefined,
          }),
        },
      },
    },
  ],
});
```

As on Postgres, read the tenant from the same `RowScopeCtx` overlay your row
scope resolver reads. The second argument is the data source name, and an
`undefined` value is skipped. Only the Oracle adapter takes the option.

What you get: each transaction the driver opens calls
`procedure(name, value)` for each value before any of your queries run, from
the same places as on Postgres. An application context outlives the
transaction on a pooled connection, so before the connection goes back to
the pool the driver calls `procedure(name, NULL)` for each value it set, and
the next request starts with none. If setting a value fails, the transaction
is rolled back, what was set is cleared, and you get the error.

### VPD policies

The context, its package, the policies and the users are your migrations. A
recipe for one tenant-scoped table:

```sql
-- The context, settable only through its package.
create or replace context app_ctx using app_owner.app_ctx_pkg;

create or replace package app_owner.app_ctx_pkg as
  procedure set_value(p_name varchar2, p_value varchar2);
end;
/
create or replace package body app_owner.app_ctx_pkg as
  procedure set_value(p_name varchar2, p_value varchar2) is
  begin
    dbms_session.set_context('app_ctx', p_name, p_value);
  end;
end;
/

-- An unset tenant matches no rows: reads return nothing, writes are refused.
create or replace function app_owner.tenant_policy(
  p_schema varchar2, p_object varchar2
) return varchar2 is
begin
  return 'tenant_id = sys_context(''app_ctx'', ''tenant_id'')';
end;
/
begin
  dbms_rls.add_policy(
    object_schema   => 'APP_OWNER',
    object_name     => 'ORDERS',
    policy_name     => 'tenant_isolation',
    function_schema => 'APP_OWNER',
    policy_function => 'tenant_policy',
    statement_types => 'SELECT,INSERT,UPDATE,DELETE',
    update_check    => true
  );
end;
/

-- The application connects as a user that owns nothing and isn't exempt.
create user app_user identified by "...";
grant create session to app_user;
grant select, insert, update, delete on app_owner.orders to app_user;
grant execute on app_owner.app_ctx_pkg to app_user;
```

The application reaches the owner's table through a synonym
(`create synonym app_user.orders for app_owner.orders`) or the entity's
`schema`. A table TypeORM created with a lower-case name is quoted:
`object_name => '"orders"'`, and `"tenant_id"` in the policy's predicate.

### Before you turn VPD on

- **Run every request in a transaction, reads included**, and **pass `ctx`
  to every repository call**, as on Postgres: without either there is no
  tenant, so reads return no rows and writes are refused or change nothing.
- **Keep per-user rules in row scope.** The policy covers the tenant only.
- **Serve callers who read across tenants from a user with
  `EXEMPT ACCESS POLICY`**, such as the one your migrations run as. As on
  Postgres, the policy still applies when `relax` lifts the tenant.
- **Include `tenant_id` in foreign keys.** Oracle checks constraints without
  the policies, so otherwise a row can point into another tenant.
- **Keep the context package working.** If clearing a value fails, the
  driver logs the error and returns the connection to the pool anyway. Until
  the next transaction on it sets its own values, a read outside a
  transaction on that connection can see the last caller's tenant. Running
  every request in a transaction closes that gap.
- **Code on the raw `DataSource`** runs outside the driver's transactions and
  has no tenant.

Views and definer's-rights code need nothing extra: VPD polices the tables
underneath them with the caller's context.

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

Each adapter exports four abstract base entities named for its database:
`Audit<Database>Entity`, `Common<Database>Entity`,
`AppendOnly<Database>Entity` and `Activity<Database>Entity` (for example
`CommonPostgresEntity`). The audit and common entities carry audit fields and
a version for optimistic locking; the append-only and activity entities are
covered below.

### Core Base Entities

| Entity | Extends | Key Fields |
| --- | --- | --- |
| `Audit<Database>Entity` | -- | dateCreated, dateUpdated, dateDeleted, version |
| `Common<Database>Entity` | `Audit<Database>Entity` | id (UUID primary key) |

The audit entities use `@CreateDateColumn`, `@UpdateDateColumn`,
`@DeleteDateColumn` (for soft deletes), and `@VersionColumn` (for optimistic
locking). Dates are `timestamptz` on Postgres, `datetime(6)` on MySQL and
MariaDB, `timestamp with time zone` on Oracle, `datetimeoffset` on SQL
Server, and `datetime` on SQLite.

### Using Base Entities

```ts
import { Entity, Column } from 'typeorm';
import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm/postgres';

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
in the `@concepta/nestjs-repository` README), extend your adapter's
`AppendOnly<Database>Entity` instead. Each has a generated UUID `id` and
`dateCreated`, and nothing that implies a row can change. The `Audit*` and
`Common*` entities are refused at startup on an append-only entity, because
their `dateDeleted` column could never be set.

```ts
import { Entity, Column } from 'typeorm';
import { AppendOnlyPostgresEntity } from '@concepta/nestjs-repository-typeorm/postgres';

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
import { AppendOnlyPostgresEntity } from '@concepta/nestjs-repository-typeorm/postgres';

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

On every supported database except SQL Server, `NULL`s are distinct in a
unique index, so originals coexist while a second correction of one record
is refused. SQL Server allows one `NULL` in a unique index, so add
`where: '"correctedId" IS NOT NULL'` to the index there.

### Activity Base Entities

For an activity store (see
[Activity Log](../nestjs-repository/README.md#activity-log)), extend your
adapter's `Activity<Database>Entity` and register it append-only:

```ts
import { Column, Entity } from 'typeorm';
import { ActivityPostgresEntity } from '@concepta/nestjs-repository-typeorm/postgres';

@Entity()
export class Activity extends ActivityPostgresEntity {
  @Column({ type: 'varchar', nullable: true })
  category!: string | null; // your own column, set in a store hook
}
```

Each has every activity column, a nullable `actorId` for your store hook to
fill, and an index on `(entityKey, recordId)` for reading a row's history.

`changed` and `values` are JSON (`jsonb` on Postgres, `json` on MySQL and
MariaDB, `simple-json` on Oracle, SQL Server and SQLite), so `values` reads
back as JSON:
a date comes back as an ISO string, a `Buffer` comes back as an object of
bytes, and a JavaScript `bigint` fails the write.
`omit` binary and `bigint` columns.

## Durable Messaging

`TypeOrmDurable`, from `@concepta/nestjs-repository-typeorm/optional/outbox`,
gives a TypeORM registration durable messaging through
`DurableMessagingModule` (see the `nestjs-repository` README). It builds the
[`@nestjs/outbox`](https://www.npmjs.com/package/@nestjs/outbox) store on the
registration's own data source: `PostgresOutboxStore` for `postgres`,
`MySqlOutboxStore` for `mysql` and `mariadb`. Every other database fails
startup with `UnsupportedDurableDriverException`. You never build the store
or touch the data source.

```sh
yarn add @nestjs/outbox
```

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { DurableMessagingModule } from '@concepta/nestjs-repository/optional/outbox';
import { TypeOrmDurable } from '@concepta/nestjs-repository-typeorm/optional/outbox';
import { TypeOrmPostgresRepositoryModule } from '@concepta/nestjs-repository-typeorm/postgres';

@Module({
  imports: [
    TypeOrmModule.forRoot({ type: 'postgres' /* ... */ }),
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmPostgresRepositoryModule,
          entities: [{ key: 'orders', entity: OrderEntity }],
        },
      ],
    }),
    DurableMessagingModule.forRoot({
      key: 'orders',
      driver: TypeOrmDurable,
      outbox: { retry: 10 },
    }),
  ],
})
export class AppModule {}
```

`outbox` takes the `OutboxModule.forRoot()` options (relay, retry,
transports): see the [outbox docs](https://docs.nestjs.com/reliability/outbox)
or the [`nestjs/outbox` repository](https://github.com/nestjs/outbox).
`DurableMessagingModule` imports `OutboxModule` for you; don't import it
yourself.

Publish next to your writes:

```ts
await this.txScope.run(ctx, async (txCtx) => {
  await this.orders.create(order, { ctx: txCtx });
  await this.durable.publish(txCtx, [
    { topic: 'order.placed', key: order.id, payload: { orderId: order.id } },
  ]);
});
```

Handle a message once. Declare the handler with `inbox: false`: `once`
records the inbox row in the handler's transaction, so the dispatcher's own
inbox check would only repeat it:

```ts
@Injectable()
export class OrderPlacedHandler {
  constructor(private readonly durable: DurableMessaging) {}

  @OnOutboxMessage('order.placed', { consumer: 'billing', inbox: false })
  async handle(payload: { orderId: string }, { message }: OutboxHandlerContext) {
    await this.durable.once(new AppContextHost(), 'billing', message.id, async (txCtx) => {
      // repository writes here commit with the inbox record
    });
  }
}
```

An inbound webhook works the same way: call `durable.once` with the
provider's delivery id as the message id.

To make a Rockets package's own write durable, wrap the package call in your
own scope and publish beside it; the package's `run()` joins your scope:

```ts
await this.txScope.run(ctx, async (txCtx) => {
  await this.invitationService.accept(txCtx, code, passcode, payload);
  await this.durable.publish(txCtx, [{ topic: 'invitation.accepted', payload: { code } }]);
});
```

Operating it:

- **Migrations.** The store owns its tables: you declare no entity and write
  no migration for them. Outside production the store creates them at
  startup. In production, startup fails until you run
  `npx nest-outbox migrate --url <database url>` in your deploy, or run
  `PostgresOutboxStore.migrationSql()` or
  `MySqlOutboxStore.migrationStatements()` from one of your own migrations.
- **Retention.** Nothing is pruned for you. Schedule
  `OutboxInbox.prune('30d')` and `OutboxDeadLetters.purge({ failedBefore })`;
  both are injectable from `@nestjs/outbox`.
- **Alerting.** `OutboxRelay.stats()` reports `pending`, `deadLetters` and
  `oldestDueAt`; the package also publishes relay events on
  `node:diagnostics_channel`.

Requirements and limits:

- Postgres, MySQL or MariaDB, through the registration's TypeORM data
  source. The outbox lives on that data source, so publish from scopes that
  write to it.
- One `DurableMessagingModule.forRoot()` per application.
- Delivery is at least once: a handler that does not use `once` must be
  idempotent.
- Payloads are stored as JSON, so a `Date` arrives as a string.

## Exceptions

| Exception | Package | Description |
| --- | --- | --- |
| `RepositoryQueryException` | `@concepta/nestjs-repository` | Repository query error (wraps original error) |
| `RepositoryDatabaseException` | `@concepta/nestjs-repository` | A query the database failed. `context.database` is the data source `type` (`postgres`, `mysql`, `mariadb`, `oracle`, `mssql`, `better-sqlite3`); `context.code` is the database client's `code` (`'ORA-00001'` on Oracle), or its `errno` when it has no `code`; on SQL Server, the error number (`2627`, `2601`) |
| `OptimisticLockException` | `@concepta/nestjs-repository` | An `update`, `replace`, `delete`, `softDelete` or `restore` targeted a stale version — see [Optimistic Locking](#optimistic-locking) |
| `SoftDeletedImmutableException` | `@concepta/nestjs-repository` | A write targeted a soft-deleted row — see [Soft-Deleted Immutability](#soft-deleted-immutability) |
| `EntityAlreadyExistsException` | `@concepta/nestjs-repository` | A `create` supplied a primary key that already names a row |
| `EntityNotFoundException` | `@concepta/nestjs-repository` | An `update` or `replace` named a row that is no longer stored |
| `PrimaryKeyImmutableException` | `@concepta/nestjs-repository` | An `update`/`replace` carried data that would change the primary key |
| `TypeOrmUnsupportedDatabaseException` | Not exported; its `errorCode` is `TYPEORM_UNSUPPORTED_DATABASE` | At startup: an entity is registered on a data source of a database its adapter isn't for |
| `TypeOrmRelationMetadataException` | Not exported; its `errorCode` is `TYPEORM_RELATION_METADATA` | At startup: a relation lacks its `@JoinColumn` or its inverse side |
| `TypeOrmMysqlFoundRowsException` | `/mysql`, `/mariadb`; its `errorCode` is `TYPEORM_MYSQL_FOUND_ROWS` | At startup: the data source turns off the `FOUND_ROWS` client flag — see [MySQL](#mysql) |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-repository-typeorm` | The abstract base every adapter extends: `TypeOrmRepository`, `TypeOrmTransaction`, `TypeOrmTransactionFactory`, plus `TypeOrmRepositoryOptions` and `TypeOrmProviderOptionsInterface` |
| `@concepta/nestjs-repository-typeorm/postgres` | `TypeOrmPostgresRepositoryModule`, `TypeOrmPostgresDriverOptionsInterface`, `TypeOrmPostgresRepository`, `TypeOrmRepositoryOptions`, `TypeOrmPostgresTransaction`, `TypeOrmPostgresTransactionFactory`, `TypeOrmTransactionSettingsResolver`, `AuditPostgresEntity`, `CommonPostgresEntity`, `AppendOnlyPostgresEntity`, `ActivityPostgresEntity` |
| `@concepta/nestjs-repository-typeorm/mysql` | `TypeOrmMysqlRepositoryModule`, `TypeOrmMysqlRepository`, `TypeOrmRepositoryOptions`, `TypeOrmMysqlTransaction`, `TypeOrmMysqlTransactionFactory`, `TypeOrmMysqlFoundRowsException`, `AuditMysqlEntity`, `CommonMysqlEntity`, `AppendOnlyMysqlEntity`, `ActivityMysqlEntity` |
| `@concepta/nestjs-repository-typeorm/mariadb` | `TypeOrmMariadbRepositoryModule`, `TypeOrmMariadbRepository`, `TypeOrmRepositoryOptions`, `TypeOrmMysqlTransaction`, `TypeOrmMysqlTransactionFactory`, `TypeOrmMysqlFoundRowsException`, `AuditMariadbEntity`, `CommonMariadbEntity`, `AppendOnlyMariadbEntity`, `ActivityMariadbEntity` |
| `@concepta/nestjs-repository-typeorm/oracle` | `TypeOrmOracleRepositoryModule`, `TypeOrmOracleDriverOptionsInterface`, `TypeOrmOracleApplicationContextInterface`, `TypeOrmOracleApplicationContextResolver`, `TypeOrmOracleRepository`, `TypeOrmRepositoryOptions`, `TypeOrmOracleTransaction`, `TypeOrmOracleTransactionFactory`, `AuditOracleEntity`, `CommonOracleEntity`, `AppendOnlyOracleEntity`, `ActivityOracleEntity` |
| `@concepta/nestjs-repository-typeorm/sqlserver` | `TypeOrmSqlServerRepositoryModule`, `TypeOrmSqlServerRepository`, `TypeOrmRepositoryOptions`, `TypeOrmSqlServerTransaction`, `TypeOrmSqlServerTransactionFactory`, `AuditSqlServerEntity`, `CommonSqlServerEntity`, `AppendOnlySqlServerEntity`, `ActivitySqlServerEntity` |
| `@concepta/nestjs-repository-typeorm/sqlite` | `TypeOrmSqliteRepositoryModule`, `TypeOrmSqliteRepository`, `TypeOrmRepositoryOptions`, `TypeOrmSqliteTransaction`, `TypeOrmSqliteTransactionFactory`, `AuditSqliteEntity`, `CommonSqliteEntity`, `AppendOnlySqliteEntity`, `ActivitySqliteEntity` |
| `@concepta/nestjs-repository-typeorm/optional/outbox` | `TypeOrmDurable`. Requires `@nestjs/outbox` |
