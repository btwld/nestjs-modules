# @concepta/nestjs-repository-drizzle

Drizzle driver for `@concepta/nestjs-repository`. Import the adapter for your
database (`/postgres`, `/mysql`, `/mariadb` or `/sqlite`), register your
Drizzle tables with it, and you get repositories that run on the
`@nestjs/drizzle` connection's transactions.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-repository-drizzle)](https://www.npmjs.com/package/@concepta/nestjs-repository-drizzle)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-repository-drizzle)](https://www.npmjs.com/package/@concepta/nestjs-repository-drizzle)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-repository-drizzle%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Choose Your Adapter](#choose-your-adapter)
- [Module Registration](#module-registration)
- [Repositories](#repositories)
- [Transaction Support](#transaction-support)
- [Row-Level Security (Postgres)](#row-level-security-postgres)
- [Exceptions](#exceptions)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-repository-drizzle @nestjs/common @nestjs/core @nestjs/drizzle drizzle-orm pg
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
| `@nestjs/drizzle` | Yes | `^0.0.2` |
| `drizzle-orm` | Yes | `^0.45.0` |

## Choose Your Adapter

| Database | Client | Import from | Register |
| --- | --- | --- | --- |
| Postgres 16 | `pg` | `@concepta/nestjs-repository-drizzle/postgres` | `DrizzlePostgresRepositoryModule` |
| MySQL 8.4 | `mysql2` | `@concepta/nestjs-repository-drizzle/mysql` | `DrizzleMysqlRepositoryModule` |
| MariaDB 11.4 | `mysql2` | `@concepta/nestjs-repository-drizzle/mariadb` | `DrizzleMariadbRepositoryModule` |
| SQLite | `better-sqlite3` | `@concepta/nestjs-repository-drizzle/sqlite` | `DrizzleSqliteRepositoryModule` |

The sections below list what differs per database; everything else in this
README applies to all four. A connection of another database stops startup
with `DrizzleUnsupportedDatabaseException`.

### Postgres

- `Where.contains('name', 'ali')` doesn't match `Alice`: text matching is
  case-sensitive.
- In ascending order, `NULL`s sort last.
- Writes return the rows they wrote in the same statement (`RETURNING`).
- Transactions run concurrently, each on its own connection.
- Use a client that runs transactions. `upsert` and every versioned write
  run in one of their own when you have none, so on a client without them,
  such as Drizzle's `neon-http` or `xata-http`, those calls fail, as does
  any `TransactionScope.run()` that calls such a repository.
- A failed statement ends the transaction it ran in. The run then fails,
  even if it catches the error, and keeps nothing it wrote; every later call
  in it throws `TransactionDoomedException`. Raw SQL you run through the
  transaction's `getClient()` is not watched: if you catch a failed
  statement there, the run still resolves and runs its `onCommit`
  callbacks, though Postgres kept nothing. Don't catch errors from raw SQL
  in a run.
- `transactionSettings` sets values at the start of every transaction, such
  as the caller's tenant — see
  [Row-Level Security (Postgres)](#row-level-security-postgres).

### MySQL

MySQL returns no rows from a write, so each write reads its rows back by
primary key, in your transaction or in one of its own.

- `create` without a key needs one the driver can read back: an
  auto-increment key, or one the key column's `$defaultFn` generates.
  Any other key the database fills in is refused with a
  `RuntimeException` before anything is written. A `createMany` whose rows
  all carry their key is one `INSERT`; otherwise each row is inserted on its
  own, so its auto-increment key can be read.
- For `bigint` values past 2^53, keys included, set
  `supportBigNumbers: true` and `bigNumberStrings: true` on the connection:
  without them `mysql2` reads such a value as a rounded number.
- Whether text matching ignores case depends on the column's collation; the
  default collations ignore it.
- In ascending order, `NULL`s sort first.
- Transactions run concurrently, each on its own connection.
- A failed statement doesn't end the transaction it ran in, except a
  deadlock, or a lock table out of memory (`'ER_LOCK_TABLE_FULL'`), which
  the driver treats the same. A deadlock fails the statement with
  `RepositoryDatabaseException`
  (`context.code` `'ER_LOCK_DEADLOCK'`), and MySQL rolls back the whole
  transaction. The run then fails, even if it catches the error, and every
  later call in it throws `TransactionDoomedException` — retry the whole
  run.
- An `upsert` of a key with no row locks the gap where the row would go,
  until the transaction ends. Concurrent upserts of new keys, the same or
  neighbouring ones, may deadlock, and other inserts into that gap wait.
- Leave `innodb_rollback_on_timeout` off (the default): with it on, a
  lock-wait timeout also rolls the whole transaction back, which the driver
  doesn't detect, so later calls in the run would run outside it.

### MariaDB

MariaDB works like [MySQL](#mysql), keys, deadlocks and collations included,
on the same `mysql2` client. The adapter can't tell a MariaDB server from a
MySQL one, so register each connection with the adapter for its server.

### SQLite

Use the `better-sqlite3` client; any other SQLite client stops startup with
`DrizzleUnsupportedDatabaseException`. Open the database yourself and turn
foreign keys on: SQLite enforces them only on a connection that asks, and
the driver changes nothing about yours.

```ts
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

DrizzleModule.forRootAsync({
  useFactory: () => {
    const db = drizzle('app.db');
    db.run(sql`pragma foreign_keys = on`);
    return { db };
  },
});
```

- Writes return the rows they wrote in the same statement (`RETURNING`).
- `Where.contains('name', 'ali')` matches `Alice`: `contains`, `starts` and
  `ends` ignore case for ASCII letters, while `eq` doesn't.
- In ascending order, `NULL`s sort first.
- A statement binds at most 32,766 values, so a larger `in` list,
  `createMany` or `deleteMany` fails with `RepositoryDatabaseException` and
  writes nothing.
- Transactions run one at a time. The database has one connection, so a
  second `TransactionScope.run()` (or a write that opens one of its own —
  see [Upsert](#upsert) and [Versions](#versions)) waits for the first to
  commit or roll back. A nested `run()` joins the
  transaction already open and never waits.
- **Pass the run's `ctx` to every call made inside it.** A call without it
  waits until the run ends, so one the run itself awaits never returns.
- A failed statement doesn't end the transaction it ran in: the run rolls
  back only if the error leaves it. The exceptions are a full database, an
  I/O error, a busy lock, out of memory and an interrupt (`context.code`
  `'SQLITE_FULL'`, `'SQLITE_IOERR'`, `'SQLITE_BUSY'`, `'SQLITE_NOMEM'`,
  `'SQLITE_INTERRUPT'`, or an extended code of one), after which SQLite may
  have rolled the whole transaction back: the run fails, even if it catches
  the error, and every later call in it throws `TransactionDoomedException`
  — retry the whole run.
- Another process holding the database's write lock fails the call with
  `RepositoryDatabaseException` and `context.code` `'SQLITE_BUSY'`, once
  better-sqlite3's `timeout` (5 seconds by default) runs out.

## Module Registration

Register each connection with `@nestjs/drizzle`, then list your adapter's
module as a driver in `RepositoryModule.forRoot()`, with the tables it
serves:

```ts
import { Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { DrizzlePostgresRepositoryModule } from '@concepta/nestjs-repository-drizzle/postgres';

export const books = pgTable('books', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  removedAt: timestamp(),
  version: integer().notNull(),
});

export class Book {
  declare id: string;
  declare title: string;
  declare removedAt: Date | null;
  declare version: number;
}

@Module({
  imports: [
    DrizzleModule.forRoot({
      drizzle,
      connection: { connectionString: process.env.DATABASE_URL },
    }),
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: DrizzlePostgresRepositoryModule,
          entities: [
            {
              key: 'books',
              entity: Book,
              table: books,
              removeDate: 'removedAt',
              version: 'version',
            },
          ],
        },
      ],
    }),
  ],
})
export class AppModule {}
```

Each key gets a repository from your adapter (`DrizzlePostgresRepository`,
…). Import `RepositoryModule.forFeature(['books'])` in a module to inject it
there with `@InjectDynamicRepository('books')`. Rows come back as instances
of `entity`, holding the table's columns.

### Provider Options

```ts
interface DrizzleProviderOptionsInterface<Entity extends PlainLiteralObject>
  extends RepositoryProviderOptions<Entity> {
  key: string;                        // Injection key
  entity: Type<Entity>;               // The class rows come back as
  table: Table;                       // The Drizzle table its rows live in
  connection?: string;                // @nestjs/drizzle connection (default: 'default')
  removeDate?: keyof Entity & string; // Soft-delete date column
  version?: keyof Entity & string;    // Version column
  rowScope?: RowScopeRegistration;    // Declarations, bound by forRoot()
  writePolicy?: WritePolicyRegistration;
  activity?: ActivityRegistration;
  hooks?: HookOption[];
}
```

- **`key`** -- string key used with `@InjectDynamicRepository(key)`
- **`entity`** -- the class each row comes back as; its name names the
  repository in errors
- **`table`** -- the Drizzle table; its columns are the entity's own
  columns, and its primary key (on a column or in the table's config) is
  the entity's
- **`connection`** -- the `name` you gave `DrizzleModule.forRoot()`;
  defaults to `'default'`
- **`removeDate`** -- the nullable date column `softDelete` sets and
  `restore` clears; reads skip rows that have one unless asked for deleted
  rows
- **`version`** -- an integer column the driver owns: `create` starts it at
  1, and each write that changes the row moves it on by one; never set it
  yourself
- **`rowScope`**, **`writePolicy`**, **`activity`**, **`hooks`** -- the
  entity's declarations, read by `RepositoryModule.forRoot()`; the driver
  ignores them

A table is matched by its connection and its schema-qualified name, so the
same table reached through two connections counts as two: give each
registration the row scope the table needs.

### Injecting Repositories

```ts
import { Injectable } from '@nestjs/common';
import { InjectDynamicRepository, type RepositoryInterface } from '@concepta/nestjs-repository';

@Injectable()
export class BookService {
  constructor(
    @InjectDynamicRepository('books')
    private readonly bookRepo: RepositoryInterface<Book>,
  ) {}

  async findAll(): Promise<Book[]> {
    return this.bookRepo.find();
  }
}
```

## Repositories

Every adapter's repository has the methods of `RepositoryInterface`
(`find`, `findOne`, `count`, `findAndCount`, `create`, `createMany`,
`update`, `upsert`, `replace`, `delete`, `deleteMany`, `softDelete`,
`restore`), runs repository hooks, and joins the caller's transaction when
you pass its `ctx`. Every `WhereClause` operator translates, and the text
operators match your value as written: `Where.contains('code', '50%')`
finds codes containing `50%`.

### Relations

Not supported yet: the driver reports no relations, so a read can't join
one. Read and write related rows through their own repositories.

### Upsert

`upsert` inserts the payload, or updates the row its primary key names with
the columns the payload holds; the others keep their stored values, so
`upsert({ id, note })` on a stored row changes only `note`. It runs in your
transaction, or in one of its own when you have none, and locks the row
before writing it, so concurrent upserts of a stored key each succeed in
turn at the default isolation level. Concurrent upserts of the same new key
insert one row; the others may fail with `RepositoryDatabaseException` (a
duplicate key, or on MySQL and MariaDB a deadlock) — retry the whole run,
or the call when it ran outside one, and it updates the row. A payload that
collides with another row on a different unique column fails with
`RepositoryDatabaseException` and writes nothing. A payload that already
holds the stored values writes nothing either, when it holds them in the
form the database stores them: `'1.50'` for a `decimal(10,2)` holding
`1.50`, not `'1.5'`.

### Versions

On an entity with a `version` column, `update`, `replace`, `upsert`,
`softDelete` and `restore` lock the row, write it, and move the version on
only when the stored row changed — an `update` with nothing new keeps it.
These versioned writes run in your transaction, or in one of their own when
you have none. A stale `entity`, or
a stale `expectedVersion`, fails with `OptimisticLockException` (see
[Expected Version](../nestjs-repository/README.md#expected-version)).

### Drizzle Features at Your Own Risk

Drizzle behaviour you declare on a table runs outside the repository's
guarantees: row scope, write policy and hooks never see what it does.

- **`$defaultFn` and `$onUpdate`** fill in values as Drizzle builds each
  insert or update, after the repository checked it. `$onUpdate` stamps its
  column whenever Drizzle builds an update of the row, which a write may do
  even when it changes nothing (the version then stays where it was), and on
  an insert that leaves the column out, unless it has a default. Which writes
  build an update is the driver's to choose, so don't rely on `$onUpdate` to
  mark that a row changed.
- **Database defaults, triggers and generated columns** are your database's:
  what they write reaches the row unchecked, and comes back in the result.

## Transaction Support

Each adapter provides a transaction and a transaction factory
(`DrizzlePostgresTransaction`, `DrizzleSqliteTransaction`, …). You don't
build these yourself: `RepositoryModule.forRoot()` registers a factory for
each connection your entities use, and `TransactionScope.run()` and
`@Transactional()` open transactions through it.

| Property / Method | Description |
| --- | --- |
| `isActive` | Whether the transaction is currently active |
| `start()` | Begin the transaction; on Postgres, apply its `transactionSettings` |
| `commit()` | Commit |
| `rollback()` | Roll back; safe to call when none is active |
| `getClient()` | The transaction's Drizzle database |

The transaction key names the adapter and the connection:
`drizzle-postgres:<connection>`, `drizzle-mysql:<connection>`,
`drizzle-mariadb:<connection>` or `drizzle-sqlite:<connection>` (e.g.,
`drizzle-postgres:default`).

### Joining a Transaction

Pass the `ctx` from `TransactionScope.run()` or `@Transactional()` and the
call joins that transaction:

```ts
import { TransactionScope } from '@concepta/nestjs-repository';

@Injectable()
export class BookService {
  constructor(
    private readonly txScope: TransactionScope,
    @InjectDynamicRepository('books')
    private readonly bookRepo: RepositoryInterface<Book>,
  ) {}

  async addBook(ctx: PlainLiteralObject, title: string) {
    return this.txScope.run(ctx, async (txCtx) => {
      return this.bookRepo.create({ title }, { ctx: txCtx });
    });
  }
}
```

A repository never opens a savepoint: a write that fails inside your
transaction does to it what any other failed statement does on your
database — see your adapter under [Choose Your Adapter](#choose-your-adapter).

### Durable Messaging

This package ships no durable driver, so
[durable messaging](../nestjs-repository/README.md#durable-messaging) (the
outbox and inbox) is not available on a Drizzle connection.

## Row-Level Security (Postgres)

Put Postgres row-level security behind row scope, and the database itself
hides other tenants' rows — even from raw SQL, reports, or a query someone
forgot to scope. Row scope stays the enforcement; RLS is the backstop.

### Setting the tenant

Give the Postgres adapter a `transactionSettings` function. Every
transaction it opens starts by setting those values, read from the caller's
context.

```ts
import { RepositoryModule, RowScopeCtx } from '@concepta/nestjs-repository';
import { DrizzlePostgresRepositoryModule } from '@concepta/nestjs-repository-drizzle/postgres';

RepositoryModule.forRoot({
  drivers: [
    {
      driver: DrizzlePostgresRepositoryModule,
      entities: [{ key: 'orders', entity: Order, table: orders }],
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
the connection name; return `{}` for one without policies. Only the
Postgres adapter takes the option.

Name each setting anything with a dot in it, and use the same name in your
policies. An `undefined` value is skipped.

What you get: each transaction the driver opens sets these values before any
of your queries run, with `set_config(name, value, true)`. That includes
`@Transactional()`, `TransactionScope.run()` and `runReadOnly()`, the
transaction an `upsert` or a versioned write (see [Versions](#versions))
opens when you have none, and the transactions other Rockets modules open
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
- **Include `tenant_id` in foreign keys.** Postgres checks foreign keys
  without the policies, so otherwise a row can point into another tenant.
- **Create views with `security_invoker = true`.** Otherwise they run as
  their owner and skip the policies. `security definer` functions always do.
- **Code on the raw Drizzle database** runs outside the driver's
  transactions and has no tenant.

## Exceptions

| Exception | Package | Description |
| --- | --- | --- |
| `RepositoryDatabaseException` | `@concepta/nestjs-repository` | A query the database failed. `context.database` is `postgres`, `mysql`, `mariadb` or `sqlite`; `context.code` is the database client's `code` (`'23505'` on Postgres, `'ER_DUP_ENTRY'` on MySQL, `'SQLITE_CONSTRAINT_PRIMARYKEY'` on SQLite), or its `errno` when it has no `code`. The message is the database's own: it never holds the query, though it may quote a value the database rejected |
| `RepositoryQueryException` | `@concepta/nestjs-repository` | Any other error a repository call raised (wraps the original error) |
| `OptimisticLockException` | `@concepta/nestjs-repository` | A write targeted a stale version — see [Versions](#versions) |
| `DrizzleUnsupportedDatabaseException` | `@concepta/nestjs-repository-drizzle` | At startup: a connection is not a database its adapter is for |

The repository's own exceptions are listed in the
[`@concepta/nestjs-repository` README](../nestjs-repository/README.md#exceptions).

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-repository-drizzle` | `DrizzleProviderOptionsInterface`, `DrizzleRepositoryOptions`, `DRIZZLE_DEFAULT_CONNECTION_NAME`, `DrizzleUnsupportedDatabaseException` |
| `@concepta/nestjs-repository-drizzle/postgres` | `DrizzlePostgresRepositoryModule`, `DrizzlePostgresDriverOptionsInterface`, `DrizzlePostgresTransactionSettingsResolver`, `DrizzlePostgresTransactionSettings`, `DrizzlePostgresRepository`, `DrizzleRepositoryOptions`, `DrizzlePostgresTransaction`, `DrizzlePostgresTransactionFactory`, `DrizzlePostgresClient` |
| `@concepta/nestjs-repository-drizzle/mysql` | `DrizzleMysqlRepositoryModule`, `DrizzleMysqlRepository`, `DrizzleRepositoryOptions`, `DrizzleMysqlTransaction`, `DrizzleMysqlTransactionFactory`, `DrizzleMysqlClient` |
| `@concepta/nestjs-repository-drizzle/mariadb` | `DrizzleMariadbRepositoryModule`, `DrizzleMariadbRepository`, `DrizzleRepositoryOptions`, `DrizzleMysqlTransaction`, `DrizzleMysqlTransactionFactory`, `DrizzleMysqlClient` |
| `@concepta/nestjs-repository-drizzle/sqlite` | `DrizzleSqliteRepositoryModule`, `DrizzleSqliteRepository`, `DrizzleRepositoryOptions`, `DrizzleSqliteTransaction`, `DrizzleSqliteTransactionFactory`, `DrizzleSqliteClient` |
