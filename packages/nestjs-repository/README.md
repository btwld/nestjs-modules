# @concepta/nestjs-repository

Repository abstraction module for NestJS. Provides a driver-agnostic
`RepositoryAdapter` base class, transaction management with automatic
nesting, and a two-level repository hook system.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-repository)](https://www.npmjs.com/package/@concepta/nestjs-repository)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-repository)](https://www.npmjs.com/package/@concepta/nestjs-repository)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-repository%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [Architecture Overview](#architecture-overview)
- [Repository Adapter](#repository-adapter)
- [Relations and Joins](#relations-and-joins)
- [Where Clause Builder](#where-clause-builder)
- [Order Clause Builder](#order-clause-builder)
- [Transaction Management](#transaction-management)
- [Transactional Decorator](#transactional-decorator)
- [Repository Hooks](#repository-hooks)
- [Row Scope](#row-scope)
- [Write Policy](#write-policy)
- [Activity Log](#activity-log)
- [Durable Messaging](#durable-messaging)
- [Repository Registry](#repository-registry)
- [Federation](#federation)
- [Injecting Repositories](#injecting-repositories)
- [Exceptions](#exceptions)
- [Entry Points](#entry-points)

## Installation

```sh
yarn add @concepta/nestjs-repository @nestjs/common @nestjs/core rxjs
```

### Requirements

ESM-only — no CJS build is published. Requires Node `>= 22.12` and
NestJS 12.

### Dependencies

| Package | Notes |
| --- | --- |
| `@concepta/nestjs-core` | Core interfaces, hook system, and utilities |
| `@tsyche/membrane` | Hook pipeline (`Permeator`/`Membrane`) — ^0.8.1 |

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS core — install explicitly, no longer bundled |
| `@nestjs/core` | Yes | Reflector for metadata — install explicitly |
| `rxjs` | Yes | Used by `TransactionalRunner` and interceptor |

## Module Registration

Register every entity once, in `forRoot()` in your application's root module.
Then import `forFeature()` with the keys each feature module injects.

### forRoot

`forRoot()` registers every entity, grouped by the driver that serves it, and
sets up the transaction infrastructure (factory registry, scope, runner,
interceptor). Import it once.

```ts
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

@Module({
  imports: [
    RepositoryModule.forRoot({
      defaultTimeout: 30000, // transaction timeout in ms (default)
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [
            { key: 'orders', entity: Order },
            { key: 'customers', entity: Customer },
          ],
        },
      ],
    }),
    OrdersModule,
  ],
})
export class AppModule {}
```

Each entry is checked against its driver's options, so a misspelled option,
or one only another driver understands, does not compile.

Every repository is checked while the application is created: a
misconfigured entity stops `NestFactory.create()` (or `Test.compile()`) with an
exception naming it. A second registration that reads the same rows, under
any key or entity class, fails with `RepositoryDuplicateUrnException`, because
its row scope, write policy and hooks could otherwise disagree with the first.

Further options for scoped, append-only or recorded entities:

| Option | Description |
| --- | --- |
| `entities[].rowScope` | Declares the entity `{ access: 'scoped', resolver }` or `{ access: 'public', reason }` — see [Row Scope](#row-scope) |
| `entities[].writePolicy` | Declares the entity `{ access: 'append-only', reason }` or `{ access: 'mutable' }` — see [Write Policy](#write-policy) |
| `entities[].activity` | Records the entity's writes in a store, `{ store, values?, omit? }` — see [Activity Log](#activity-log) |
| `options` | The driver's own options, such as the TypeORM driver's `transactionSettings`; type-checked against the driver |
| `imports` | Modules exporting the row scope resolvers your entities declare |

```ts
RepositoryModule.forRoot({
  imports: [OrdersRowScopeModule], // exports OrdersRowScope — see The resolver
  drivers: [
    {
      driver: TypeOrmRepositoryModule,
      entities: [
        {
          key: 'orders',
          entity: Order,
          rowScope: { access: 'scoped', resolver: OrdersRowScope },
        },
      ],
    },
  ],
});
```

### forRootAsync

Entities stay static; only the settings come from the factory.

```ts
@Module({
  imports: [
    RepositoryModule.forRootAsync({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [{ key: 'orders', entity: Order }],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        defaultTimeout: configService.get('TX_TIMEOUT', 30000),
      }),
    }),
  ],
})
export class AppModule {}
```

Everything the factory injects must be singleton-scoped: a request-scoped
dependency would keep the repositories from being bound and checked at
startup, so `app.init()` refuses it (`RepositoryBootException`).

### forFeature

`forFeature()` makes repositories registered in `forRoot()` injectable in the
module that imports it, by key:

```ts
@Module({
  imports: [RepositoryModule.forFeature(['orders', 'customers'])],
  providers: [OrdersService],
})
export class OrdersModule {}

@Injectable()
export class OrdersService {
  constructor(
    @InjectDynamicRepository('orders')
    private readonly orders: RepositoryInterface<Order>,
  ) {}
}
```

A repository is injectable only where its key is imported. A key `forRoot()`
did not register fails at startup, and so does `forFeature()` in an
application that never imports `forRoot()`.

Modules from other packages that take repository keys, such as
`UserModule.forRoot({ entities: { user: 'user' } })` or
`CrudModule.forFeature()`, import their keys themselves.

### Settings

```ts
interface RepositoryModuleOptionsInterface {
  defaultTimeout?: number; // Transaction timeout in milliseconds (default: 30000)
  requireRowScopeDeclaration?: boolean; // Fail startup on an entity with no rowScope (default: false)
  requireWritePolicyDeclaration?: boolean; // Fail startup on an entity with no writePolicy (default: false)
}
```

`requireRowScopeDeclaration` turns "nobody declared this entity" into a
startup failure rather than a silent omission. Off by default because whether
an undeclared entity is a mistake depends on the deployment: an application
that scopes everything wants it on, one that scopes a handful of entities
among many does not — see [Row Scope](#row-scope).
`requireWritePolicyDeclaration` does the same for `writePolicy` — see
[Write Policy](#write-policy).

## Architecture Overview

```text
Application Code
  |
RepositoryModule (forRoot registers / forFeature exposes)
  |
  +-- RepositoryAdapter (abstract, driver-agnostic)
  |     Concrete implementations: one per driver
  |
  +-- Transaction Layer
  |     TransactionScope -> TransactionManager -> TransactionFactory
  |
  +-- Hook System
  |     @RepoHook + @BeforeCreate / @AfterFind / etc.
  |
  +-- Registry
        RepositoryRegistryService (every registered repository)
```

- **RepositoryAdapter** -- abstract base class implementing
  `RepositoryInterface` with query, create, update, delete, and lifecycle
  operations
- **Transaction Layer** -- `TransactionScope` orchestrates transaction
  lifecycle with automatic nesting; `TransactionManager` manages active
  transactions for one scope, shared by every participant via a refcount;
  factories are registered per driver/datasource
- **Hook System** -- two-level decorators (high-level semantic + fine-grained)
  for cross-cutting concerns like auditing, tenant filtering, and validation
- **Registry** -- every repository `forRoot()` registered, checked so that no
  two read the same rows

## Repository Adapter

`RepositoryAdapter` is the abstract base class that all driver-specific
repository implementations extend. It implements `RepositoryInterface` with
a template-method design: the public operations (`find`, `create`, `update`,
etc.) are concrete wrappers that run the hook pipeline, each delegating to a
protected abstract `do*` method that the driver implements.

### Abstract Members

Concrete implementations must provide these protected `do*` methods, plus
the `metadata` property:

| Category | Method | Signature |
| --- | --- | --- |
| Query | `doFind` | `(options?) => Promise<Entity[]>` |
| Query | `doFindOne` | `(options) => Promise<Entity \| null>` |
| Query | `doCount` | `(options?) => Promise<number>` |
| Query | `doFindAndCount` | `(options?) => Promise<[Entity[], number]>` |
| Create | `doCreate` | `(entity, options?) => Promise<Entity>` |
| Create | `doCreateMany` | `(entities, options?) => Promise<Entity[]>` |
| Update | `doUpdate` | `(entity, data, options?) => Promise<Entity>` |
| Update | `doUpsert` | `(entity, options?) => Promise<Entity>` |
| Update | `doReplace` | `(entity, data, options?) => Promise<Entity>` |
| Delete | `doDelete` | `(entity, options?) => Promise<Entity>` |
| Delete | `doDeleteMany` | `(entities, options?) => Promise<Entity[]>` |
| Delete | `doSoftDelete` | `(entity, options?) => Promise<Entity>` |
| Lifecycle | `doRestore` | `(entity, options?) => Promise<Entity>` |
| Utility | `metadata` | `RepositoryMetadataInterface<Entity>` (abstract property) |

Override `describeDatabaseError(error)` to report an error your database raised
as `{ database, code?, message }`; the caller then receives a
`RepositoryDatabaseException` carrying them. It returns `undefined` by
default, so a database error arrives as a plain `RepositoryQueryException`
like any other opaque error.

### Create Inserts, It Never Updates

`create` and `createMany` are inserts. A primary key that already names a row
is an error (`EntityAlreadyExistsException`), not an instruction to overwrite
it — use `upsert` for insert-or-update.

This is enforced in `RepositoryAdapter` rather than left to each driver:
`assertNotExisting` runs immediately before `doCreate`, so a driver may still
implement `doCreate` with a save-style primitive. The guard reads through the
protected `doFindOne`, which bypasses both hooks and row scope — deliberately,
because the question is whether the key is taken, not whether the caller may
see the row that took it. A scoped read cannot tell "does not exist yet" from
"belongs to another scope", and either answer is wrong: one refuses every
caller-supplied key, the other permits a cross-scope overwrite.

If your clients choose their own keys, they can find out that a key is in use
even when another tenant holds it: `create` refuses it, and under a
[row scope](#row-scope) `upsert` answers `404`. Where that matters, let the
database generate the key.

Caller-supplied primary keys are otherwise fine. A key is only checked when
every primary column is present. A *partial* composite key is refused with
`PartialPrimaryKeyException` (HTTP 400) naming the missing columns: it cannot
identify a row, so nothing can tell whether it is taken, and a driver
implementing create as a save-by-key would otherwise fail reporting that it
cannot *update* a row. Supplying none of the key columns is the ordinary
generated-key create and is untouched.

**This is a check-then-write with a real race.** A row inserted between the
check and the write is *overwritten* rather than rejected, because a driver
implementing create as a save-by-key re-reads and updates — so no uniqueness
constraint catches it. A transaction narrows the window but does not close it
at READ COMMITTED, where the driver's own re-read sees the committed row.
Losing the race requires a concurrent insert of the *same* primary key:
unreachable for generated keys, narrow for caller-supplied ones.

### Concrete Members

The public `find`, `findOne`, `count`, `findAndCount`, `create`,
`createMany`, `update`, `upsert`, `replace`, `delete`, `deleteMany`,
`softDelete`, and `restore` methods are concrete — each runs the
[hook pipeline](#hook-pipeline) around the matching `do*` method.

| Member | Visibility | Description |
| --- | --- | --- |
| `getPrimaryColumns()` | protected | Get primary key column names from metadata (subclass-author API) |
| `getVersionColumn()` | protected | Get the optimistic-locking version column name from metadata, if any — backs both the in-request lock and `expectedVersion` (subclass-author API) |
| `getDeleteDateColumn()` | protected | Get the soft-remove date column name from metadata, if any (subclass-author API) |
| `toDnf(clause)` | protected | Convert `WhereClause` AST to Disjunctive Normal Form (subclass-author API) |
| `runHooks(methodKey, payload, ctx, filter?)` | protected | Execute repository hooks for a lifecycle event; `filter` selects by hook metadata, which is how `{ replace: true }` routing works (subclass-author API) |
| `allowsEagerRelations` | public | Whether the entity set `allowEagerRelations`, so a driver knows whether to load eager relations |

### Implementing a Repository

```ts
import { RepositoryAdapter } from '@concepta/nestjs-repository';

class MyDriverRepository<Entity extends PlainLiteralObject>
  extends RepositoryAdapter<Entity> {
  readonly metadata = { /* ... */ };

  protected async doFind(options?) {
    return this.client.select(translate(options));
  }

  protected async doCreate(entity, options?) {
    return this.client.insert(entity);
  }

  // ... implement the remaining do* methods
}
```

**Override `do*` methods only.** A driver must never override a public
operation method (`find`, `create`, `update`, …): those are where row scope,
hooks, and the soft-delete guards are invoked, so an override bypasses all of
them for every entity that driver serves, silently. Nothing enforces this —
it is a contract a driver author has to keep.

Each entry in `metadata.columns` must supply `name`, `isPrimary`,
`isRemoveDate`, and `isVersion`. Set `isVersion: true` on the
optimistic-locking version column, if the driver has one — `getVersionColumn()`
reads it. Adapters that leave it `false` everywhere simply get no
optimistic-locking support.

Setting `isRemoveDate: true` on a column declares that your driver supports soft
delete for that entity. `softDelete` and `restore` set and clear it, and a read
without `withDeleted` leaves out rows where it is set, both on the entity and on
every relation the read joins. A driver that cannot do all of that reports no
such column, and `softDelete` and `restore` then throw.

`metadata.urn` names the rows an entity reads, and each relation's `targetUrn`
(and `through.urn` for a many-to-many junction) names the rows it reaches.
Derive them from your entity definitions as `urn:<driver>:…`, so that two
entities reading the same rows report the same URN whatever their class names.
The repository only compares them; row scope uses them to find relations into
scoped rows.

Your driver's module class is what applications list in `forRoot()`'s
`drivers`. It implements `RepositoryDriverInterface`: a static
`register(entities)` that returns one provider per entity, under
`getDynamicRepositoryToken(key)`, the `imports` those providers need, and any
`transactionFactories`. Keep those providers and everything your transaction
factories inject singleton-scoped: anything request-scoped is never built at
startup, and `app.init()` refuses it.
Construct each repository with its key and the optional `HookResolverService`
only. Row scope, hooks, write policy and the eager opt-in are not yours to
pass: `forRoot()` binds them to every repository you return, from the
application's entry, and a repository that was never bound refuses every call
(`RepositoryUnboundException`). Applications never call `register`. Extend
`RepositoryProviderOptions` with your driver's own entity options, and
`forRoot()` type-checks each entry against them. Take options for the driver
as a whole as `register`'s second parameter, `register(entities, options?)`:
applications pass them as the registration's `options`, type-checked the
same way.

### Soft-Deleted Immutability

A soft-deleted row is immutable: `update`, `replace`, and `upsert` all reject
it with `SoftDeletedImmutableException` (409 Conflict), for every driver —
the guard lives in `RepositoryAdapter` itself, above the `do*` methods, so no
driver implementation can forget it or diverge from it. `restore()` is the
sanctioned way back.

```ts
import { SoftDeletedImmutableException } from '@concepta/nestjs-repository';

try {
  await repository.update(entity, { name: 'New Name' });
} catch (err) {
  if (err instanceof SoftDeletedImmutableException) {
    // entity is soft-deleted — restore it first
  }
}
```

Soft-deleting an already-soft-deleted row is a no-op rather than an error:
`softDelete()` returns the entity unchanged instead of re-stamping its delete
date, since a retried HTTP DELETE must not fail.

### Expected Version

On an entity with a version column, `update` and `replace` reject a write
whose stored row's version is no longer current. That guards a read-then-write
inside one request, but two requests that each
re-read before writing both pass it, since each compares against its own
fresh value. `expectedVersion` closes that gap: pass the version the caller
last read, and `update`, `replace`, `delete`, `softDelete`, and `restore`
all reject a mismatch with `OptimisticLockException` (409 Conflict) —
enforced once in `RepositoryAdapter`, for every driver. Every write that
changes a stored row bumps its version, `upsert` included, so a version read
before any of them conflicts after it.

```ts
import { OptimisticLockException } from '@concepta/nestjs-repository';

try {
  await repository.update(entity, { name: 'New Name' }, { expectedVersion: 3 });
} catch (err) {
  if (err instanceof OptimisticLockException) {
    // someone else changed this row since the caller last read it
  }
}
```

Passing `expectedVersion` against an entity with no version column throws a
`RuntimeException` with `fault: 'usage'` — a caller asking for a guarantee
the entity cannot provide is a wiring mistake, not a client error.
`upsert()` and `deleteMany()` don't accept it: neither has a single
caller-held row whose version the client could have read.

Drivers never decide any of this — `RepositoryAdapter` resolves a
`RepositoryVersionGuardInterface` descriptor (`{ column, value }`) and
passes it down via `options.versionGuard`; a driver's only job is to
execute an atomic compare-and-swap on `column === value` before writing.
`versionGuard` is not a caller option: it is added to the options a driver's
`do*` methods receive (`RepositoryVersionGuardOptions`), and a value a caller
passes anyway is overwritten.

## Relations and Joins

Repository find options accept a `join` array of `JoinClause` entries to load
related entities alongside the root query.

### JoinClause

Each `JoinClause` names a relation to include in every row the read returns:

```ts
interface JoinClause {
  relation: string; // relation name (must match entity metadata)
}
```

```ts
// Load a single relation
const [users, total] = await userRepo.findAndCount({
  join: [{ relation: 'company' }],
});
// users[0].company → Company | null

// Several relations; many-to-many junctions come from relation metadata
const [users, total] = await userRepo.findAndCount({
  join: [{ relation: 'posts' }, { relation: 'roles' }],
});
```

A join never changes which rows come back. A user with no company is still
returned, with `company: null`, and a user with no posts with `posts: []`.
Only `where` narrows rows.

A join naming a relation the entity does not declare is refused with a `400`
(see [What a read may name](#what-a-read-may-name)).

### Rows That Have a Related Row

To return only rows that have a related row, filter on a column the related
row always holds, such as its primary key:

```ts
// Users with at least one post
const withPosts = await userRepo.find({
  join: [{ relation: 'posts' }],
  where: Where.rel('posts', Where.notNull<PostEntity>('id')),
});

// Users whose company exists
const withCompany = await userRepo.find({
  join: [{ relation: 'company' }],
  where: Where.rel('company', Where.notNull<CompanyEntity>('id')),
});
```

Filter on the related row, not on the user's own `companyId`. A user whose
company was soft-deleted still holds its `companyId`, so a filter on that key
keeps the user, with `company: null`.

### Filtering by Relations

Use `Where.rel()` to filter by fields on a related entity. The relation
must be included in the join:

```ts
const w = Where.for<UserEntity>();

const [users, total] = await userRepo.findAndCount({
  join: [{ relation: 'posts' }],
  ...w.where(
    w.and(
      w.eq('status', 'active'),
      Where.rel('posts', Where.eq<PostEntity>('published', true)),
    ),
  ),
});
```

### Sorting by Relations

Use `OrderBy.rel()` to sort by fields on a related entity:

```ts
const [users, total] = await userRepo.findAndCount({
  join: [{ relation: 'posts' }],
  ...OrderBy.order(
    OrderBy.rel('posts', OrderBy.desc<PostEntity>('createdAt')),
    OrderBy.asc<UserEntity>('name'),
  ),
});
```

### Relation Metadata

Your driver reports each entity's relations from its entity definitions. You
can also configure per-relation behavior on its `forRoot()` entry:

```ts
RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmRepositoryModule,
      entities: [{
        key: 'users',
        entity: UserEntity,
        relations: {
          posts: { federated: true }, // read through its own repository
          addresses: { cascade: true }, // written with the user
        },
      }],
    },
  ],
});
```

A relation marked `federated: true` is read through the related entity's own
repository instead of a join. See [Federation](#federation). A relation marked
`cascade: true` is written with the entity. See
[Cascading writes](#cascading-writes).

### Writing relations

A write changes only the entity's own table, and only its columns reach the
driver:

| In the payload | Result |
| --- | --- |
| a foreign key column, e.g. `{ companyId: 7 }` | written; `null` clears it |
| a relation marked `cascade: true` | written through the related entity's own repository — see [Cascading writes](#cascading-writes) |
| any other relation, e.g. `{ company: { id: 7 } }` or `{ users: [...] }` | refused with `RelationWriteException` (`400`), naming the foreign key column to send instead where there is one |
| any other property that is not a column | refused with `UnknownColumnException` (`400`) |
| a function in place of a column value, or an object in a key column | refused with `InvalidColumnValueException` (`400`) |
| a property whose value is `undefined` | left out; it carries no value |

The entity that names the stored row in `update`, `replace`, `delete`,
`deleteMany`, `softDelete` and `restore` is a row, not data to write: its
relations and any other property that is not a column are left out, however
the row was read. A function value, or an object in a key column, is still
refused there.

To change related rows, write them through their own repository, so their row
scope, write policy and hooks run, or mark the relation `cascade: true` and let
the entity's writes do it. Otherwise, what happens to related rows on delete is
your database's foreign key action.

Behaviour you declare on an entity for your driver to run on its own, such as
code that runs whenever a row is written, runs outside these guarantees, at
your own risk. Your driver's README lists what it runs.

A `join` still returns related rows as objects.

Two entity shapes are refused at startup with `RepositoryBootException`: a
relation whose foreign key has no column of its own, since it could never be
written, and a primary or foreign key column defined as a getter or setter on
the entity class. Keys are plain properties.

### Cascading writes

Mark a relation `cascade: true`, and its rows are written with the entity:

```ts
entities: [
  {
    key: 'invoices',
    entity: InvoiceEntity,
    relations: { lines: { cascade: true } },
  },
  { key: 'invoice-lines', entity: InvoiceLineEntity },
],
```

```ts
const invoice = await invoices.create(
  { number: 'A-1', lines: [{ sku: 'widget' }, { sku: 'gear' }] },
  { ctx },
);
// invoice.lines holds both lines, each with invoiceId set to invoice.id
```

Each related row is written through its own repository, so its hooks, row
scope and write policy run just as if you had called it yourself. Its foreign
key is always set to the entity's key, whatever the payload holds.

| Your call | What happens to the related rows |
| --- | --- |
| `create`, `createMany` | each one listed is created |
| `update` | left alone if the payload leaves the relation out; otherwise each listed row that is already one of the entity's is updated, any other is created, and the rest are kept |
| `replace`, `upsert` | as `update`, and the related rows a listed relation leaves out are deleted |
| `delete`, `deleteMany` | deleted first, then the entity |
| `softDelete` | soft deleted first, then the entity |
| `restore` | every soft-deleted one is restored first, including any deleted on its own before the entity, then the entity |

A to-one relation names the one row the entity has: its payload updates that
row, or creates it if there is none, and `null` deletes it. A payload with a
different key is refused by the related repository
(`PrimaryKeyImmutableException`). A to-one with more than one stored row is
refused with `CascadeWriteException` (`409`). A soft-deleted row is not the one
the entity has, so a new one is created beside it.

A `create`, `update`, `replace` or `upsert` returns the entity with the related
rows that call wrote — for an `update`, only the rows the payload listed, not
the ones it kept. Cascades nest: a related entity's own cascade relations are
written the same way.

Run a cascading write in a [transaction](#transaction-management) to make it
all or nothing. Without one, a related row refused halfway leaves the rows
written before it in place, and a delete whose `expectedVersion` no longer
matches is refused only after its related rows are gone.

A related row someone wrote directly with a foreign key to another tenant's
row is invisible to that tenant's cascade, so your database's foreign key then
refuses the delete. Check foreign keys in `scopeWrite` to prevent it (see
[Checks this class cannot make](#checks-this-class-cannot-make)).

A cascade finds the related rows it keeps, updates or deletes by reading them
as the caller, so a caller whose reads are
[relaxed](#reading-more-broadly-than-you-write) reaches rows they may not
write. A tenant admin deleting a project that holds a colleague's drafts is
refused with a `404` rather than leaving those drafts behind.

A relation can cascade only where its rows hold the foreign key to the entity's
primary key, a single column: a one-to-many, or the other side of a
one-to-one. Startup refuses `cascade: true`, with `RepositoryBootException`, on:

- a relation whose foreign key the entity holds — a write never changes the
  row it points to;
- a relation not joined on the entity's single primary key column, including
  any relation of an entity with a composite primary key;
- relations that lead back to an entity they started from, such as a category
  cascading to its child categories — a cascading delete would never finish;
- a many-to-many relation — write its junction rows through their own
  repository;
- a relation that is also `federated`;
- a relation whose entity is not registered in `forRoot()`;
- a relation from a soft-deleted entity to one without a delete date column.

A cascade into append-only rows is refused with `WritePolicyBootException`,
unless the entity is append-only too, so that only its creates cascade.

A payload whose cascade relation holds the wrong shape — anything but a list of
objects for a to-many relation, or an object or `null` for a to-one — is
refused with `CascadeWriteException` (`400`).

### What a read may name

A read reaches another table only through a relation it names in `join`:

| In the read options | Result |
| --- | --- |
| an own column in `select`, `where` or `order` | passed to the driver |
| a relation in `join`, and a `Where.rel()` filter or relation sort on a joined relation | passed to the driver |
| a relation name, or any other non-column, as a `select`, `where` or `order` field | refused with `UnknownColumnException` (`400`) |
| a relation that is not declared | refused (`400`) |
| a relation into rows that have a row scope, in `join` | refused (`400`), unless both resolvers are `joinable`, this one holds the caller to every scope column the other does, and the join matches them; see [Relations and row scope](#relations-and-row-scope) |
| a `Where.rel()` filter or relation sort on a relation missing from `join` | refused (`400`); add it to `join` |
| a `Where.rel()` filter or relation sort on a field that is not a column of the related entity | refused with `UnknownColumnException` (`400`) |
| a sort direction other than `ASC` or `DESC` | refused (`400`) |

```ts
// Refused: `orders` is a relation, not a column.
await customers.find({ where: Where.gt('orders', 0) });

// Passed: the relation is joined, then filtered.
await customers.find({
  join: [{ relation: 'orders' }],
  where: Where.rel('orders', Where.eq('status', 'open')),
});
```

The check runs on every read, after hooks and after a row scope resolver, so
nothing those return can name more than a caller could.

A count is decided by `where`, `join` and `withDeleted` alone. `select`,
`order`, `skip` and `take` shape or page the rows, not how many match, so
`count` takes the same options as the `find` it totals:

```ts
const query = { where: Where.eq('status', 'active'), skip: 40, take: 20 };

const page = await customers.find(query);
const total = await customers.count(query); // every match, not the page
```

`findAndCount` returns both at once.

### What a result holds

A row comes back holding its own columns and the relations its read joined,
each of those holding the related entity's own columns. That holds for the
rows a write returns too. If the driver hands back anything else, the call
throws `RepositoryQueryException` instead of returning it.

An entity whose relations load on their own, eagerly, opts in with
`allowEagerRelations`:

```ts
RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmRepositoryModule,
      entities: [
        { key: 'comments', entity: CommentEntity, allowEagerRelations: true },
      ],
    },
  ],
});
```

Its rows may then also hold any declared relation, holding that relation's own
columns, as a join would. A relation loaded inside it, or anything that is not
a column or a declared relation, still throws. An entity with a relation into
rows that have a row scope cannot opt in, nor can one with a
[federated](#federation) relation: startup refuses it (see
[Relations and row scope](#relations-and-row-scope)).

## Where Clause Builder

The `Where` helper builds driver-neutral
`WhereClause` AST objects that `RepositoryAdapter` implementations translate
into driver-specific queries.

### How Translation Works

1. The `Where` helper builds a `WhereClause` AST (tree of conditions and
   compound operators)
2. `RepositoryAdapter.toDnf()` flattens the AST into Disjunctive Normal Form
   (an OR of ANDs)
3. The driver translates each AND-branch
   into a driver-specific query object
4. Same-field conditions within a branch are merged (e.g., `gt` + `lt` on the
   same field become a combined range)

### Always-False Clauses

An *absent* `where` (no clause at all) and an *unsatisfiable* `where` (a
clause that matches zero rows) are different things, and `toDnf` never
conflates them: an absent `where` is `undefined`, `toDnf` never returns `[]`
at all, and `Where.never()` — not an empty `IN ()`, not an empty `AND`/`OR` —
is the only representation of "match nothing."

This matters because `and(...conditions)`/`or(...conditions)` are variadic,
and a caller building one from a possibly-empty array (a resolved set of
allowed values, for instance) needs a defined answer for the empty case:

- `Where.and()` with zero conditions **throws** — an empty `AND` has no
  conditions to be false about, and guessing "true" (no constraint) would be
  the wrong direction for a security-relevant clause. Callers spreading a
  possibly-empty array into `and()` must guard emptiness themselves.
- `Where.or()` with zero conditions returns `Where.never()` — `OR`'s
  identity for "none of these" is unambiguous, so
  `Where.or(...allowedIds.map((id) => Where.eq('id', id)))` is correct by
  construction even when `allowedIds` is empty, with no caller-side guard
  needed.
- `Where.and(callerClause, Where.never())` still evaluates to "match
  nothing" — a `never()` conjoined onto anything can't be flattened away by
  `toDnf`, so a guard clause built this way can't be silently widened back
  into "no restriction" by later composition.

### Static API

Pass the entity type as a generic parameter on each call:

```ts
import { Where } from '@concepta/nestjs-repository';

// Simple equality
const activeOrders = await orderRepo.find(
  Where.where(Where.eq<OrderEntity>('status', 'active')),
);

// Compound conditions
const result = await orderRepo.find(
  Where.where(
    Where.and(
      Where.eq<OrderEntity>('status', 'active'),
      Where.gt<OrderEntity>('total', 100),
      Where.contains<OrderEntity>('notes', 'urgent'),
    ),
  ),
);

// OR conditions
const result = await orderRepo.find(
  Where.where(
    Where.or(
      Where.eq<OrderEntity>('status', 'shipped'),
      Where.eq<OrderEntity>('status', 'delivered'),
    ),
  ),
);
```

### Typed Builder API

Bind the entity type once with `Where.for<Entity>()`. All subsequent calls
type-check field names against the entity:

```ts
import { Where } from '@concepta/nestjs-repository';

const w = Where.for<OrderEntity>();

// Simple query
const orders = await orderRepo.find(
  w.where(w.eq('status', 'active')),
);

// Nested AND/OR
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

// Null checks and range
const orders = await orderRepo.find(
  w.where(
    w.and(
      w.notNull('assigneeId'),
      w.between('total', 100, 500),
    ),
  ),
);

// Set membership
const orders = await orderRepo.find(
  w.where(
    w.in('status', ['pending', 'processing', 'shipped']),
  ),
);

// Text matching
const orders = await orderRepo.find(
  w.where(
    w.and(
      w.starts('sku', 'ELEC-'),
      w.notContains('notes', 'cancelled'),
    ),
  ),
);
```

### Relation Conditions

Use `rel()` to tag a condition with a relation name. The condition is applied
as a filter on the related entity (see [Filtering by Relations](#filtering-by-relations)):

```ts
const w = Where.for<OrderEntity>();

// Filter orders by customer tier
const orders = await orderRepo.findAndCount({
  join: [{ relation: 'customer' }],
  ...w.where(
    w.and(
      w.eq('status', 'active'),
      w.rel('customer', Where.eq<CustomerEntity>('tier', 'gold')),
    ),
  ),
});
```

### Condition Operators

| Method | Description |
| --- | --- |
| `eq(field, value)` | Equal |
| `ne(field, value)` | Not equal |
| `gt(field, value)` | Greater than |
| `gte(field, value)` | Greater than or equal |
| `lt(field, value)` | Less than |
| `lte(field, value)` | Less than or equal |
| `contains(field, value)` | Contains substring |
| `notContains(field, value)` | Does not contain substring |
| `starts(field, value)` | Starts with |
| `notStarts(field, value)` | Does not start with |
| `ends(field, value)` | Ends with |
| `notEnds(field, value)` | Does not end with |
| `in(field, values)` | In array |
| `notIn(field, values)` | Not in array |
| `isNull(field)` | Is null |
| `notNull(field)` | Is not null |
| `between(field, from, to)` | Between range (inclusive) |

The text operators (`contains` through `notEnds`) take a string and match it
as written: no character in it is a wildcard, so `contains('sku', '50%')`
finds SKUs containing `50%`. Whether case matters depends on your database;
your driver's README says which.

### Compound Operators

| Method | Description |
| --- | --- |
| `and(...conditions)` | All conditions must match — **throws** if called with zero conditions (an empty `AND` has nothing to be false about; silently accepting one would let it collapse to "no constraint" whenever the input array happens to be empty) |
| `or(...conditions)` | Any condition must match — returns `never()` if called with zero conditions, since "none of them matched" is `OR`'s unambiguous identity for the empty case |
| `never()` | Always false — matches zero rows. Renders as a literal always-false predicate (never an operator, like an empty `IN ()`, that merely *happens* to fold to constant-false), and can never be optimized, flattened, or narrowed away back into "no constraint" — see "Always-False Clauses" above. The canonical way to express "resolved to nothing" for a fail-closed guard clause (e.g. an empty allowed-values set), instead of falling through to unscoped. |

### Utility Methods

| Method | Description |
| --- | --- |
| `where(clause)` | Wrap a `WhereClause` into `{ where: clause }` for passing to `find()` |
| `rel(relation, condition)` | Tag a condition with a relation name |
| `for<Entity>()` | Create a typed builder with field name checking |

## Order Clause Builder

The `OrderBy` helper builds driver-neutral
`OrderClause` arrays that `RepositoryAdapter` implementations translate
into driver-specific sort options.

### Static OrderBy API

Pass the entity type as a generic parameter on each call:

```ts
import { OrderBy } from '@concepta/nestjs-repository';

// Single sort
const users = await userRepo.find(
  OrderBy.order(OrderBy.asc<UserEntity>('name')),
);

// Multiple sorts (priority follows array order)
const users = await userRepo.find(
  OrderBy.order(
    OrderBy.desc<UserEntity>('createdAt'),
    OrderBy.asc<UserEntity>('name'),
  ),
);
```

### Typed OrderBy Builder API

Bind the entity type once with `OrderBy.for<Entity>()`. All subsequent calls
type-check field names against the entity:

```ts
import { OrderBy } from '@concepta/nestjs-repository';

const o = OrderBy.for<UserEntity>();

const users = await userRepo.find(
  o.order(o.desc('createdAt'), o.asc('name')),
);
```

### Relation Sorting

Use `rel()` to sort by a field on a related entity (see
[Sorting by Relations](#sorting-by-relations)):

```ts
// Sort users by post title, then by creation date
const users = await userRepo.findAndCount({
  join: [{ relation: 'posts' }],
  ...OrderBy.order(
    OrderBy.rel('posts', OrderBy.asc<PostEntity>('title')),
    OrderBy.desc<UserEntity>('createdAt'),
  ),
});
```

### Sort Methods

| Method | Description |
| --- | --- |
| `asc(field)` | Ascending sort |
| `desc(field)` | Descending sort |

### OrderBy Utility Methods

| Method | Description |
| --- | --- |
| `order(...keys)` | Wrap sort keys into `{ order: keys }` for passing to `find()` |
| `rel(relation, key)` | Tag a sort key with a relation name |
| `relDot(dotField, key)` | Extract relation from `"relation.field"` dot notation |
| `for<Entity>()` | Create a typed builder with field name checking |

### Combining Where + OrderBy

Spread both helpers into find options:

```ts
const w = Where.for<OrderEntity>();
const o = OrderBy.for<OrderEntity>();

const orders = await orderRepo.find({
  ...w.where(w.eq('status', 'active')),
  ...o.order(o.desc('createdAt')),
});
```

### Passing Context

All repository methods accept an optional `ctx` property in their options.
The `ctx` is a `PlainLiteralObject` that carries the entity key,
transaction state, and hook configuration. When `ctx` has an active `trx`
(TransactionManager), the repository automatically uses the transactional
connection — no manual wiring required.

Spread `Where.where()` into options alongside `ctx`:

```ts
const w = Where.for<OrderEntity>();

// Query within a transaction
const orders = await orderRepo.find({
  ...w.where(w.eq('status', 'active')),
  ctx,
});

// Create within a transaction
const order = await orderRepo.create(dto, { ctx });

// Nested service calls share the same transaction via ctx
await this.txScope.run(ctx, async (txCtx) => {
  const orders = await orderRepo.find({
    ...w.where(w.gt('total', 100)),
    ctx: txCtx,
  });
  await auditRepo.create(
    { action: 'query', count: orders.length },
    { ctx: txCtx },
  );
});
```

The `ctx` is propagated through nested `TransactionScope.run()` calls. Inner
calls join the outer transaction automatically. Pass the `txCtx` handed to
the operation — not the outer `ctx` — to repository calls inside it. See
[Transaction Management](#transaction-management) for details.

## Transaction Management

The transaction layer provides automatic transaction lifecycle management
with automatic nesting support.

### TransactionScope

`TransactionScope` is the primary API for running operations within
transactions. It is provided globally by `RepositoryModule.forRoot()`.

```ts
import { TransactionScope } from '@concepta/nestjs-repository';

@Injectable()
export class OrderService {
  constructor(private readonly txScope: TransactionScope) {}

  async createOrder(ctx: PlainLiteralObject, dto: DeepPartial<OrderEntity>) {
    return this.txScope.run(ctx, async (txCtx) => {
      // Pass txCtx, not ctx, to repository calls inside the operation
      const order = await orderRepo.create(dto, { ctx: txCtx });
      const item = await inventoryRepo.findOne({
        where: { id: order.itemId },
        ctx: txCtx,
      });
      await inventoryRepo.update(item, { reserved: true }, { ctx: txCtx });

      // Register post-commit callback
      txCtx.trx.onCommit(() => {
        // Send confirmation email after successful commit
      });

      return order;
    });
  }
}
```

### Domain Events with mergeObjectContext

When using DDD aggregates that extend `AggregateRoot` from `@nestjs/cqrs`,
use `EventPublisher.mergeObjectContext()` to wire up event publishing, then
register `commit()` and `uncommit()` as post-commit/rollback callbacks.
This ensures domain events are only published after the transaction succeeds.

```ts
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly repositoryResolver: OrderRepositoryResolver,
  ) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    const { ctx, namespace, dto } = command;

    const orderRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const order = this.eventPublisher.mergeObjectContext(
        Order.create(eventContext, dto),
      );

      await orderRepo.save(txCtx, order);

      txCtx.trx.onCommit(() => order.commit());     // publish domain events
      txCtx.trx.onRollback(() => order.uncommit());  // discard domain events

      return order;
    });
  }
}
```

`orderRepo` here is a DDD aggregate repository of your own — note the
`save(ctx, aggregate)` shape, which `RepositoryInterface` does not have. It
would be resolved through a resolver you write and would call a
`RepositoryInterface` underneath. The point of the example is the transaction
scope and the commit/rollback callbacks, not the repository shape.

```ts
// Read-only transaction (always rolls back). onRollback callbacks run
// (the scope did roll back); onCommit callbacks never run.
await this.txScope.runReadOnly(ctx, async (txCtx) => {
  return orderRepo.find({ ctx: txCtx });
});

// Custom timeout
await this.txScope.run(ctx, operation, {
  timeout: 5000,
});
```

### Nesting

Nested and concurrent `run()` calls on the same context join a single
transaction, which commits or rolls back when the last participant exits —
not necessarily the first one to have entered (or immediately if any
participant times out). After that, the context carries no transaction
state — a later `run()` on it starts a fresh, independent transaction.

```ts
// Outermost — creates transaction
await this.txScope.run(ctx, async (txCtx) => {
  await serviceA.doWork(ctx); // joins existing transaction
  await serviceB.doWork(ctx); // joins existing transaction
});
// Transaction commits here (or rolls back on error) — ctx is now released

// A later, unrelated run() on the same ctx starts an independent scope
await this.txScope.run(ctx, async (txCtx) => {
  await serviceC.doWork(ctx);
});
```

Inside the operation, prefer the `txCtx` handed to you over the outer `ctx`
for repository calls: a stale `txCtx` fails loudly with
`TransactionClosedException` once its scope has settled, while a stale
`ctx` silently falls back to running non-transactionally. Don't hold either
one past the point `run()` resolves, and don't spawn unawaited work inside
the operation — anything still running once the transaction settles writes
outside it either way.

Because every participant shares one scope, a sibling's failure can doom
work that otherwise succeeded:

- If a participant's own operation succeeds, but a nested or concurrent
  sibling sharing the same scope fails, that participant's `run()` call
  rejects with `TransactionScopeFailedException` (carrying the sibling's
  error as `context.originalError`) rather than resolving as if nothing
  happened — even if the caller caught the sibling's error itself.
- `readOnly` is decided once, by whichever `run()` call creates the scope —
  every later participant just joins it. A nested or concurrent `run()`
  (or `runReadOnly()`) call whose explicit `readOnly` option conflicts with
  the scope it's joining throws `TransactionReadOnlyConflictException`
  instead of silently discarding one side's intent. `timeout`, by contrast,
  is honored per participant, not scope-wide.

### TransactionManager

`txCtx.trx` is a `TransactionManager` — the handle for registering
post-commit/rollback work and, for non-repository work, reading the
cancellation signal.

| Method | Description |
| --- | --- |
| `onCommit(fn)` | Register post-commit callback; throws `TransactionClosedException` once the scope has closed |
| `onRollback(fn)` | Register post-rollback callback; a `readOnly` scope always rolls back, so these run whether or not its operation succeeded; throws `TransactionClosedException` once the scope has closed |
| `signal` | `AbortSignal` that aborts once the scope is doomed (an operation threw, or the final commit failed), carrying that failure as `signal.reason`. Stays unaborted for a scope that settles cleanly — it signals "doomed", not "settled" |

`getOrStart(key)` also exists but is used by repository/driver internals —
application code doesn't call it directly.

`onCommit`/`onRollback` callbacks flush one at a time, in registration
order, once the scope settles, so a later callback can rely on an earlier
one having fully finished first. A callback that throws is logged, not
rethrown — it doesn't fail `run()` and doesn't stop the callbacks after it
from running, so a callback that must not fail silently should handle its
own errors.

#### Cancellation and timeouts

`trx.signal` aborts as soon as the scope is doomed, so operations doing
non-repository work (an HTTP call, a queue publish) can opt in to stopping
early instead of running to completion against a transaction that's already
rolling back:

```ts
await txScope.run(ctx, async (txCtx) => {
  const res = await fetch(url, { signal: txCtx.trx.signal });
  ...
});
```

This is cooperative — nothing here forcibly stops an operation that ignores
the signal. A timed-out `run()` rejects with `TransactionTimeoutException`;
an operation that outlives the timeout keeps running as an abandoned orphan,
and its eventual failure is logged rather than surfaced to the caller, who
has long since moved on. A timeout settles the scope immediately rather
than waiting for every participant to exit, so a sibling still running —
nested or concurrent, even one well within its own timeout — gets
`TransactionClosedException` from its `txCtx`, and its `run()` rejects with
`TransactionScopeFailedException` even if its own operation goes on to
succeed.

The timeout covers the operation, not settlement — a `commit()` or
`rollback()` call that hangs (a dead connection, a lock wait) is not
bounded by it and can leave `run()` unresolved indefinitely. There is no
safe way to abandon an in-flight commit without knowing whether it landed.

#### Multiple datasources

A single `run()` scope can span transactions on more than one datasource.
Commits are sequential, not two-phase: if one fails after another has
already committed, `run()` rejects with `TransactionHeuristicCommitException`
instead of an ordinary commit error, since that earlier commit can't be
undone. `onRollback` callbacks run in that case — never `onCommit` — even
for the datasource(s) that durably committed, so domain events registered
via `onCommit(() => agg.commit())` are treated as not-yet-safe-to-publish.

### TransactionFactory

Each driver/datasource provides a `TransactionFactoryInterface`:

```ts
interface TransactionFactoryInterface {
  create(ctx: AppContextHost): TransactionInterface;
  readonly supportsConcurrentTransactions?: boolean;
}
```

Factories are registered automatically by `RepositoryModule.forRoot()` from
each driver that returns `transactionFactories` in its
`DynamicRepositoryModule`.

`create` is called once per scope and data source, with the context the
scope runs under. Read the caller's overlays from it, row scope included, to
prepare the transaction; never define overlays on it.

`supportsConcurrentTransactions` defaults to `true` when omitted — the normal
case for a pooled/multi-connection backend, where each transaction gets its
own connection. A driver whose connections are shared (one connection per
data source, not per transaction) should declare `false`: `TransactionManager`
then queues transactions for that factory's key, so a second transaction on
the same connection waits for the first to commit or roll back instead of
racing its `BEGIN` — see
[nestjs-repository-typeorm's Single-Connection Drivers](../nestjs-repository-typeorm/README.md#single-connection-drivers)
for the concrete case this exists for. A queued wait still counts against
`run()`'s own `timeout` (see Cancellation and timeouts, above): a scope can
time out while still queued, before its own transaction ever starts, and it
releases its slot immediately rather than blocking whichever scope is next
in line.

## Transactional Decorator

The `@Transactional()` decorator wraps controller routes in transactions
declaratively. It can be applied at the class level (all routes) or method
level (individual routes).

```ts
import { Transactional } from '@concepta/nestjs-repository';

@Controller('orders')
@Transactional()
export class OrderController {
  @Post()
  async create(@Body() dto: DeepPartial<OrderEntity>) {
    // Runs in a transaction
  }

  // Disable transaction for this route
  @Get()
  @Transactional(false)
  async list() {
    // No transaction
  }

  // Read-only transaction
  @Get(':id')
  @Transactional({ readOnly: true })
  async read(@Param('id') id: string) {
    // Read-only transaction (always rolls back)
  }
}
```

### Options

```ts
interface TransactionalOptions {
  readOnly?: boolean;
  timeout?: number; // milliseconds (default: 30000)
}
```

- **`readOnly`** -- always roll back, for read-only operations (default: `false`)
- **`timeout`** -- transaction timeout in milliseconds

Method-level `@Transactional()` overrides class-level settings.
Pass `false` to disable transactions for a specific method.

`@Transactional()` also works on RPC message handlers (preview). In a
WebSocket gateway it throws `AppContextUnavailableException`; open the
transaction yourself with `TransactionScope.run(ctx, …)`.

### TransactionalRunner

`TransactionalRunner` is used internally by `TransactionInterceptor` to
check for `@Transactional()` metadata and wrap operations. It can also be
used directly in custom interceptors:

```ts
import { TransactionalRunner } from '@concepta/nestjs-repository';

@Injectable()
export class CustomInterceptor implements NestInterceptor {
  constructor(private readonly txRunner: TransactionalRunner) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return this.txRunner.run(context, () => next.handle());
  }
}
```

### Detecting `@Transactional()`

`isTransactional()` and `getTransactionalOptions()` read the metadata
`@Transactional()` sets, without depending on the underlying metadata key —
useful for building tooling (route audits, OpenAPI generation, custom
interceptors) that needs to know whether a route is transactional:

```ts
import { getTransactionalOptions, isTransactional } from '@concepta/nestjs-repository';

// Pass targets in override order (e.g. handler before class), same as
// Nest's own Reflector.getAllAndOverride — the first target that carries
// the metadata wins.
isTransactional(context.getHandler(), context.getClass()); // boolean

// Resolve the options themselves (undefined if none, false if explicitly
// disabled with `@Transactional(false)`)
getTransactionalOptions(context.getHandler(), context.getClass());
```

## Repository Hooks

The hook system provides cross-cutting concerns for repository operations.
Hooks are resolved at runtime via `@concepta/nestjs-core` and can be scoped
to specific entities using specifications. This section covers the
repository-specific decorators and merge semantics; for the underlying
mechanism (how a class becomes a hook, how it's attached to a controller,
and how values get into `ctx`) see `@concepta/nestjs-core`'s
[Hook Feature](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-core#hook-feature)
and [Context System](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-core#context-system)
sections.

### Defining a Hook

```ts
import { Injectable } from '@nestjs/common';
import {
  type AppContextInterface,
  type DeepPartial,
  OverlayRef,
} from '@concepta/nestjs-core';
import {
  RepoHook,
  BeforeFind,
  BeforeCreate,
  type RepositoryFindOptions,
  Where,
} from '@concepta/nestjs-repository';

// Typed token for the signed-in user — attached to the request context by a
// ContextOverlayInterceptor registered as an APP_INTERCEPTOR (see nestjs-core's
// Context System docs for the interceptor that populates this).
export const ActorCtx = new OverlayRef<'withActor', { userId: string }>(
  'withActor',
);

@RepoHook()
@Injectable()
export class OrderDefaultsHook {
  // Hook output replaces the query options wholesale, so a caller's own
  // `where` is ANDed with this filter, never dropped.
  @BeforeFind()
  async hideArchived(
    options: RepositoryFindOptions<OrderEntity>,
  ): Promise<RepositoryFindOptions<OrderEntity>> {
    const condition = Where.eq('archived', false);
    return {
      ...options,
      where: options.where ? Where.and(options.where, condition) : condition,
    };
  }

  // { replace: true } makes this hook's output win over the caller's, so a
  // `createdBy` in the request body cannot override the stamp. Without it,
  // the default merge would let the caller's value win — see "Hook Pipeline"
  // below.
  @BeforeCreate({ replace: true })
  async stampCreator(
    data: DeepPartial<OrderEntity>,
    ctx: AppContextInterface,
  ): Promise<DeepPartial<OrderEntity>> {
    // `require()` throws when the overlay is absent.
    const actor = ctx.require(ActorCtx).withActor();

    return { ...data, createdBy: actor.userId };
  }
}
```

**Don't isolate tenants with hooks.** A hook runs only on the operations it
decorates, so a read filter and a create stamp leave `update`, `replace`,
`upsert` and the delete family reaching every tenant's rows. Use
[Row Scope](#row-scope), which the repository applies to every operation.

### Wiring Hooks

Register the hook on the entity it belongs to, in `forRoot`. Two things
have to be true for it to run:

1. **`CoreModule.forRoot()`** (or `.register()`) is imported. It provides
   `HookResolverService`.
2. **The hook class is listed in `providers`** of some module, so Nest's DI
   can resolve it. Any module the application imports when it starts will
   do; no extra `imports` entry is needed.

```ts
import { Module } from '@nestjs/common';
import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

@Module({
  imports: [
    CoreModule.forRoot(), // 1. required for any hook to run
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [
            { key: 'orders', entity: Order, hooks: [OrderDefaultsHook] },
          ],
        },
      ],
    }),
  ],
  providers: [OrderDefaultsHook], // 2. required so DI can resolve it
})
export class AppModule {}
```

A hook registered this way runs on **every** call that reaches the entity —
an HTTP route, another entity's hook calling this repository, a queue
consumer, a seeder, a test. Nothing further is needed outside HTTP.

A declared hook that could never run is a startup failure
(`HookBootException`), not a silent no-op. Caught when the application is
created: a missing `CoreModule`, a class listed twice for one entity, a hook
missing its `@RepoHook()`, one decorated for another subsystem, and one the
container cannot resolve — including one provided only by a lazily loaded
module.

#### Request-scoped hooks

`@UseHooks(TheHook)` on a controller or method attaches a hook to a
*request* instead — directly on a plain controller, or via
`extraDecorators: [UseHooks(TheHook)]` on a CRUD controller's options.

```ts
import { Controller } from '@nestjs/common';
import { UseHooks } from '@concepta/nestjs-core';

@UseHooks(AdminAuditHook)
@Controller('orders')
export class OrderController {}
```

Both paths work and are unioned per call, deduplicated by class — a hook
reaching the same entity twice runs once, and warns
(`ROCKETS_HOOKS_DUPLICATE`). Registered hooks run before route-declared ones.

The hook list lives on the request's `ctx`, which cuts both ways: it is absent
outside HTTP routes and RPC message handlers, so the hook does not run for a
cron job, a seeder or a test; and it is read by every repository call that
receives that `ctx`, so an ungated hook also runs for other entities written
during the request. See
[what a hook reaches](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-core#what-a-hook-reaches).

Prefer registration unless the hook is genuinely cross-cutting or specific to
one route.

> A hook runs on calls that carry no particular overlay — a nested write, a
> queue consumer, a seeder. To read one, `ctx.require(ref).withRef()` refuses
> such a call; `ctx.supports(ref)` branches on it instead.
>
> A refusal from an `after*` hook comes too late to undo the row that hook ran
> for, and a hook writing to a second entity leaves the first one written.
> Wrap the operation in a `TransactionScope` if that matters.

### Scoped Hooks

To target one entity, register the hook on it — `hooks:` on its `forRoot`
entry reaches that entity and nothing else.

Specifications are for the cuts registration cannot express: a subset of
operations, or a condition on the context. `RepoSpec.isEntity` narrows a hook
that already reaches several entities — a cross-cutting `@UseHooks` one, or a
class registered on more than one entity:

```ts
import { RepoHook, RepoSpec, AfterCreate } from '@concepta/nestjs-repository';

@RepoHook(RepoSpec.isEntity('User'))
export class UserOnlyHook {
  @AfterCreate()
  notifyUserCreated(result, ctx) {
    // Only runs for User entity operations
    return result;
  }
}
```

`RepoSpec.isEntity(name)` builds an `EntitySpecification` (also exported
for direct use) that matches when the repository's entity key equals `name`.

### Hook Decorators

Hooks are organized into two levels: high-level semantic decorators that
match broad categories, and fine-grained decorators for specific operations.

#### High-Level Semantic

| Decorator | Matches |
| --- | --- |
| `@BeforeRead` | find, findOne, count, findAndCount |
| `@AfterRead` | find, findOne (count and findAndCount have their own after-keys) |
| `@BeforeWrite` / `@AfterWrite` | create, createMany, update, upsert, replace |
| `@BeforeTransition` / `@AfterTransition` | softDelete, restore |
| `@BeforeDestroy` / `@AfterDestroy` | delete, deleteMany (hard delete) |

#### Fine-Grained

| Category | Decorators |
| --- | --- |
| Query | `@BeforeFind` `@AfterFind` `@BeforeFindOne` `@AfterFindOne` `@BeforeCount` `@AfterCount` `@BeforeFindAndCount` `@AfterFindAndCount` |
| Create | `@BeforeCreate` `@AfterCreate` `@BeforeCreateMany` `@AfterCreateMany` |
| Update | `@BeforeUpdate` `@AfterUpdate` `@BeforeUpsert` `@AfterUpsert` `@BeforeReplace` `@AfterReplace` |
| Delete | `@BeforeDelete` `@AfterDelete` `@BeforeDeleteMany` `@AfterDeleteMany` |
| Lifecycle | `@BeforeSoftDelete` `@AfterSoftDelete` `@BeforeRestore` `@AfterRestore` |

Hook methods receive the operation payload and an optional context, and must
return the (possibly modified) payload.

The five write decorators — `@BeforeWrite`, `@BeforeCreate`, `@BeforeUpdate`,
`@BeforeUpsert`, `@BeforeReplace` — additionally accept
`{ replace: true }` in place of (or alongside) a specification, e.g.
`@BeforeCreate({ replace: true })`. See "Hook Pipeline" below for what it
changes and when to use it; every other decorator's signature is unaffected.

### Hook Pipeline

Hook execution is orchestrated by `RepoPermeatorFactory`, built on
`@tsyche/membrane` (`Permeator`/`Membrane`). Each public repository
operation runs before-hooks on its input, calls the driver's `do*` method,
then runs after-hooks on the result, with one of two merge semantics for
single-entity payloads and options objects (`Membrane.object` /
`Membrane.objectReplace`), and a separate strategy for array payloads
(`Membrane.collection`):

- **`Membrane.objectReplace`** -- read operations (`find`, `findOne`,
  `count`, `findAndCount`): the last hook's return value replaces the
  payload/result wholesale, so hooks may freely transform options and
  results.
- **`Membrane.object`** -- single-entity write operations (`create`,
  `update`, `upsert`, `replace`) and delete/lifecycle operations (`delete`,
  `deleteMany`, `softDelete`, `restore`): hook output is merged onto the
  original, which wins on conflict — **the caller's own payload survives
  hook mutations by default.** This is right for enrichment (a hook filling
  in a default the caller is free to override) but wrong for authorization
  (a hook enforcing a value the caller must not be able to override, e.g. a
  tenant id) — a caller who explicitly supplies that same field defeats the
  hook silently, no error either way. For tenant enforcement specifically, a
  hook is the wrong tool entirely regardless of merge strategy: use
  [Row Scope](#row-scope), which runs after every before-hook and immediately
  before `do*`, and whose scope input hooks cannot influence.
- **`{ replace: true }`** on any of the five write decorators inverts this
  for that hook only: it runs through `Membrane.objectReplace` instead, in a
  second pass after every plain (merge) hook for the same key, so its output
  wins regardless of what the caller supplied. Use this whenever a hook is
  enforcing something, not suggesting it — see the `@BeforeCreate({ replace:
  true })` example above. `RepoHookStrategy` (exported alongside the
  decorators) is the pair of predicates this routing is built on, in case
  you need to reason about it directly.
- **`Membrane.collection`** -- `createMany` (`overwrite`: hooks may freely
  transform the array) and `deleteMany` (`preserve`: the original array
  wins on conflict) keep the strategy argument, since it governs array
  merging rather than object replacement. `createMany` hooks already behave
  like `{ replace: true }` unconditionally — there's no merge-vs-replace
  choice to make for it.

Any error thrown inside the pipeline (a hook or the driver call) is wrapped
in `RepositoryQueryException`. `RuntimeException` subclasses — `OptimisticLockException`,
`FederationException`, the transaction exceptions, and any already-wrapped
`RepositoryQueryException` — pass through unchanged, so callers can catch
them by type and their `httpStatus` survives to the transport layer.

An error your database raised arrives as `RepositoryDatabaseException`, a
`RepositoryQueryException` whose `context` also names the database and its
own error code, for logs and diagnosis. Those codes differ between databases.

Two `OverlayRef` tokens are exported for reading repository state from an
`AppContextHost` (via `ctx.with(ref)` or `@Ctx(ref)`):

| Export | Description |
| --- | --- |
| `RepoCtx` | Overlay carrying the entity key in scope: `{ entity: string }` |
| `TrxCtx` | Overlay carrying the active `TransactionManager`: `{ trx }` |

## Row Scope

Row scope restricts which *rows* a caller may read and write — multi-tenancy
being the common case. It applies to every repository operation and to direct
repository calls, not only to calls that pass through a controller.

**The division of labour is the thing to understand first.** The implementer
owns all enforcement: the read predicate, stamping a write, refusing one, any
visibility read. The framework owns exactly one guarantee — that your callback
is invoked at every repository entry point, with that operation's real input,
before the driver sees it. It never inspects or second-guesses what you
return. There is deliberately no read-side guard: if your resolver returns an
unscoped query, it runs.

For scope expressible as column equality — one column or several — extend
[`RowScopeBase`](#rowscopebase) rather than writing that enforcement
yourself.

**Layers above the repository are covered without knowing about it.** Because
enforcement lives in the repository, a `@concepta/nestjs-crud` controller over a
scoped entity is scoped too, with no row-scope code of its own: list returns
only the caller's rows, a read, update or delete aimed at another scope is a
`404`, and a create carrying a foreign scope column in the request body is a
`403`. `nestjs-crud` has no row-scope awareness at all — it resolves a row and
hands it to the repository, which is where the resolver runs. The same is true
of any service or handler that calls a scoped repository, as long as it passes
the request's `ctx`.

### Declaring an entity

Every entity is scoped, public, or undeclared:

```ts
rowScope: { access: 'scoped', resolver: TenantRowScope }
rowScope: { access: 'public', reason: 'shared reference data, not tenant-owned' }
```

`public` requires a reason because it is a decision someone has to defend
later. Undeclared is allowed unless the deployment sets
`requireRowScopeDeclaration`.

### The resolver

```ts
// Whatever your overlay carries. Snippets further down read `userId`, `role`
// and `region` off it, so they are declared here too.
interface TenantScope {
  tenantId?: string;
  userId?: string;
  role?: string;
  region?: string;
}

@Injectable()
export class OrdersRowScope implements RowScopeInterface<TenantScope> {
  scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, TenantScope>,
  ): Options {
    const tenantId = params.scope?.tenantId;
    if (typeof tenantId !== 'string') {
      throw new RuntimeException({ message: 'No tenant', fault: 'client' });
    }
    const scope = Where.eq('tenantId', tenantId);
    return {
      ...params.options,
      where: params.options.where
        ? Where.and(params.options.where, scope)
        : scope,
    };
  }

  async scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value, TenantScope>,
  ): Promise<Value> {
    // Stamp an unstamped write; refuse one naming another tenant. Never
    // silently rewrite a foreign scope to the caller's own.
    return params.value;
  }
}
```

A write also hands the resolver `params.repository`, the repository being
written, so one resolver serving several entities can read back the row a write
names. That read is itself scoped.

Provide the resolver from a module that `forRoot()` imports:

```ts
@Module({
  providers: [OrdersRowScope],
  exports: [OrdersRowScope],
})
export class OrdersRowScopeModule {}
```

### `RowScopeBase`

Most resolvers are the same shape: one or more columns carry the scope value.
`RowScopeBase` implements that, so a resolver is usually just configuration:

```ts
@Injectable()
export class TenantRowScope extends RowScopeBase<TenantScope> {
  constructor() {
    super({ scope: ['tenantId'], joinable: true });
  }
}
```

`scope` names the columns carrying the caller's scope. Each column's value is
read from the `RowScopeCtx` key of the same name; when the key is named
differently, write `{ column: 'tenantId', key: 'tenant' }`. `joinable` lets
reads [join](#relations-and-row-scope) between scoped entities.

Register it for every tenant-owned entity:

```ts
entities: [
  {
    key: 'orders',
    entity: Order,
    rowScope: { access: 'scoped', resolver: TenantRowScope },
  },
  {
    key: 'order-lines',
    entity: OrderLine,
    rowScope: { access: 'scoped', resolver: TenantRowScope },
  },
],
```

It implements four rules and nothing else:

1. **Reads inject the scope columns into the `WHERE`** — those the caller is
   held to, when some are [relaxed](#reading-more-broadly-than-you-write).
2. **Writes naming an existing row pre-check** with the primary key *and* the
   scope columns in the `WHERE`. The pre-check's own clause decides, so a miss
   is a `404` — including a row the caller can read through `relax` but may not
   write.
3. **`create` is new data** — the scope columns are stamped onto it. There is no
   pre-check: a create names no existing row, and the adapter
   [already refuses](#create-inserts-it-never-updates) one whose key is taken,
   whatever scope owns it. An `upsert` whose key names no stored row is new data
   on the same reasoning, and is stamped rather than pre-checked; one whose key
   names a row falls under rule 2.
4. **The scope columns take precedence** over any same-named value in the
   payload, and a mismatch is refused rather than rewritten.

Each write is pre-checked against the repository it is for, and refusals name
that entity. Every entity registered with the resolver must have each `scope`
column; startup refuses one that doesn't.

Scope values and primary keys may be strings or numbers. Primary key columns
are read from the entity's own metadata, so composite primary keys work too — a
key counts as naming a row only when every primary column is present.

It assumes **every scoped entity carries its own scope column**, so scope is
decided per row without following a relation. That assumption is what makes the
rest simple (see [Relations and row scope](#relations-and-row-scope)).

#### Composite scope

List more than one column. The same values are used for the read predicate,
the write pre-check and the stamp, so they cannot drift apart:

```ts
super({ scope: ['tenantId', 'region'], joinable: true });
```

A caller missing any of the values is refused with a `403`. An empty `scope` is
treated as a misconfiguration rather than as a superuser: the resolver reads
nothing (`Where.never()`) and writes nothing.

Scope that is not equality on columns — a set of tenants, say — is not this
class's job; implement [`RowScopeInterface`](#when-not-to-use-it) directly.

#### Reading more broadly than you write

Some callers read more than they write: an administrator sees a whole tenant,
or every tenant, but writes only as themselves. That is the `relax` option.

`relax` is called with the caller's scope — the `RowScopeCtx` overlay your
interceptor attaches from the authenticated user (see
[`scope` versus `ctx`](#scope-versus-ctx)) — and returns the scope columns that
caller is not held to on reads:

```ts
@Injectable()
export class DraftRowScope extends RowScopeBase<TenantScope> {
  constructor() {
    super({
      scope: ['tenantId', 'userId'],
      joinable: true,
      relax: (scope: TenantScope) => {
        switch (scope.role) {
          case 'global-admin':
            return ['tenantId', 'userId'];
          case 'tenant-admin':
            return ['userId'];
          default:
            return [];
        }
      },
    });
  }
}
```

A caller's reads are filtered by the columns `relax` leaves:

| `relax` returns | Reads | Example |
| --- | --- | --- |
| nothing | the caller's own rows | a user |
| some columns | rows matching the rest | a tenant admin: `['userId']` reads the whole tenant |
| every column | every row | a global admin |

Writes are never relaxed. Every write is pre-checked and stamped with the
caller's full scope, so a tenant admin can read a colleague's draft but
updating it is a `404`, and a global admin's `create` lands in their own
tenant, as themselves. A relaxed column needs no value on the overlay for a
read; a write without it is a `403`.

What `relax` decides on is up to you. Reading a user's own rows across every
tenant they work in is the same tool, keyed on whether the overlay has a tenant
selected:

```ts
relax: (scope: TenantScope) =>
  scope.tenantId === undefined ? ['tenantId'] : [],
```

That reads the user's rows in every tenant — including any they have since
left. If membership has to be checked, the scope is a set of tenants:
implement [`RowScopeInterface`](#when-not-to-use-it) directly.

Keep `relax` a pure function of the scope: it is asked once for the filter and
again when the read [joins](#relations-and-row-scope). It is not called when no
overlay is attached, and a column it returns that is not in `scope` is ignored.

A resolver using `relax` stays `joinable`: what a caller may join follows the
columns it is held to. A `scopeQuery` override that reads more broadly is still
possible, but leave `joinable` off it.

#### Checks this class cannot make

A foreign key that must point inside the caller's scope is the common case:
nothing about a scoped read on the child says which parent a child points at.
Give the child its own resolver, override `scopeWrite` (call `super` first), and
inject the repository to read. Its module imports that repository with
`RepositoryModule.forFeature(['orders'])` — not a circular dependency, since a
repository never depends on its resolver:

```ts
@Injectable()
export class OrderLinesRowScope extends RowScopeBase<TenantScope> {
  constructor(
    @InjectDynamicRepository('orders')
    private readonly orders: RepositoryInterface<Order>,
  ) {
    super({ scope: ['tenantId'], joinable: true });
  }

  override async scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value, TenantScope>,
  ): Promise<Value> {
    const scoped = await super.scopeWrite(params);

    const orderId = scoped.orderId;
    if (orderId === undefined) return scoped;

    const order = await this.orders.findOne({
      where: Where.eq('id', orderId),
      ctx: params.ctx,
    });

    if (!order || order.tenantId !== params.scope?.tenantId) {
      this.refuse(HttpStatus.FORBIDDEN, 'Order line must point at your order');
    }

    return scoped;
  }
}
```

The value a resolver receives holds only the entity's own columns — a write
carrying a relation is refused before it runs — so read columns straight off
the value.

Finding the order is not enough on its own when the orders resolver uses
[`relax`](#reading-more-broadly-than-you-write): an admin can read orders they
may not write to. Compare every scope column the line must share with it, as
the `tenantId` check above does.

#### Relations and row scope

A `join`, a `Where.rel()` filter or a sort on a relation runs in the database,
so **the related entity's resolver never sees it**. Whether that is safe depends
on which side has a row scope:

| From → to | A relation |
| --- | --- |
| scoped → scoped, both `joinable` | allowed, **joinable when the join includes the columns the related resolver holds the caller to**: see below |
| any other scoped → scoped | allowed, but **never joined**: see below |
| unscoped → unscoped | allowed |
| unscoped → scoped | **refused at startup**: reading it would return rows the caller is not allowed to see |

For the last case, give the unscoped entity a row scope, or remove the relation
from it and declare the relation on the scoped entity's side only.

A [federated](#federation) relation is allowed and joinable in every case: it
is read through the related entity's own repository, so that entity's resolver
runs. The one exception is `allowEagerRelations`: an entity with any relation
into scoped rows, or any federated relation, cannot set it, since the driver
would load those rows on its own.

The check follows rows, not entity names. A relation is refused when it reaches
rows any scoped entity reads — under another class name, or through a
many-to-many whose junction rows are scoped.

Rows are registered once ([forRoot](#forroot)), so they have one row
scope. For access that must see every scope, such as a back-office report or a
seeder, go through the scoped repository with a scope your resolver
[relaxes](#reading-more-broadly-than-you-write).

**Joining between scoped entities.** A read can join a relation between two
scoped entities when:

- both resolvers are `joinable` — the same class or not;
- each scope column the related entity's resolver holds this caller to is
  also held by this entity's, read from the same `RowScopeCtx` key;
- the join matches each of those columns to itself — that is, the foreign key
  includes it: `(tenantId, orderId)` pointing at the order's `(tenantId, id)`.

If the join leaves a scope column out, it is refused with a `400` that names
the columns to join on.

```ts
const lines = await orderLines.find({ join: [{ relation: 'order' }], ctx });
```

The joined rows carry the caller's `tenantId` already, so the related
resolver's check is satisfied by construction. How to declare the foreign key
is your driver's business; see its README.

The check is made per caller, on the columns each resolver holds that caller
to after [`relax`](#reading-more-broadly-than-you-write). With projects scoped
by `tenantId` and drafts by `tenantId` and `userId`:

| Caller | drafts → project | project → drafts |
| --- | --- | --- |
| a user | joins | refused: drafts hold them to `userId`, projects don't |
| a tenant admin (drafts relax `userId`) | joins | joins |
| a global admin (both relax everything) | joins | joins |

A caller held to nothing on one side joins only into rows that hold them to
nothing either: a global admin joining into a resolver that still scopes them
by tenant is refused.

`joinable` is your statement that the resolver reads exactly by the scope
columns it holds each caller to. `relax` keeps that true. Leave it off a
resolver whose `scopeQuery` reads more for some callers or rows — shared public
rows, say — or less: a join would hand out rows the related resolver would
not.

A composite foreign key also settles which order a line may point at, when the
database enforces it and its columns are not nullable: the database refuses a
line whose `orderId` names another tenant's order, so the line needs no foreign
key check of [its own](#checks-this-class-cannot-make).

**Every other relation between two scoped entities** stays declared, but no
read can join it: a `join` naming it is refused with a `400`. That covers a
resolver that is not `joinable`, rows scoped on other columns — tenant-scoped
orders joining notes scoped by their owner — a many-to-many,
and a scoped entity's relation to its own rows without the scope column in the
join, such as an employee's `manager` or `reports`. Read the related rows
through their own repository, with the caller's `ctx`, so their resolver runs:

```ts
const line = await orderLines.findOne({ where: Where.eq('id', id), ctx });
const order =
  line &&
  (await orders.findOne({ where: Where.eq('id', line.orderId), ctx }));
```

No entity with a relation into scoped rows can set `allowEagerRelations`, even
a joinable one (startup refuses it): eager loading is a join no read asked for.

Without a composite foreign key, keep each resolver checking the foreign keys
it owns on write ([above](#checks-this-class-cannot-make)). `RowScopeBase` does
not do this for you, so without that override a line can name another scope's
order. Reading through `orders` still returns nothing for it, but the line
points there.

Writes never cross a relation on their own: a relation in a write payload is
refused unless it is marked [`cascade`](#cascading-writes), and a cascade
writes each related row through its own repository, where its resolver runs.

Anything that writes rows without going through a repository, such as a
seeding library writing through your ORM, bypasses row scope entirely: it
stamps no scope columns and checks nothing. Set the scope columns yourself
there, or seed through the repository with a `ctx` carrying the scope.

#### Natural keys need a serializable transaction

Rule 2 is a check-then-write: the pre-check reads the row, and the write that
follows identifies it by primary key alone. That read has to be authoritative,
which means `SERIALIZABLE` or a row lock. `READ COMMITTED` narrows the window;
no transaction leaves it open.

This only matters when another scope can acquire the same primary key between
the two statements, so it is unreachable for generated keys. With
**caller-supplied natural keys** it is reachable — the row is deleted, another
scope creates the same key, and the write lands on it — and it has been
reproduced overwriting and re-scoping the new owner's row. Use generated keys
for scoped entities, or run scoped writes in a serializable transaction.

The create guard has the same race on the same terms; see
[Create Inserts, It Never Updates](#create-inserts-it-never-updates).

#### When not to use it

Implement `RowScopeInterface` directly for any rule that is not equality on
entity columns.

### `scope` versus `ctx`

`params.scope` is the authority on **who the caller is**. It is the
`RowScopeCtx` overlay, resolved from the caller's context *before hooks run*
so nothing downstream can change which principal you enforce against. What you
receive is a fresh copy of the overlay's values each call, so mutating it
affects nothing.

`params.ctx` is plumbing: the context the driver will run under, after hooks.
Pass it through unchanged on any read your resolver makes, so that read joins
the caller's transaction. Building a fresh context instead silently drops it.

**Never decide scope from `params.ctx`.** A hook can replace it, and a
resolver reading its tenant from there lets a `beforeRead` hook choose which
principal is enforced.

Attach the overlay from a `ContextOverlayInterceptor`, before the handler
runs — which is the answer to "the tenant arrives in a request header":

```ts
@Injectable()
export class TenantScopeOverlay extends ContextOverlayInterceptor {
  readonly ref = RowScopeCtx;

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    this.appContext(context).defineOverlay(
      RowScopeCtx,
      { tenantId: request.user?.tenantId },
      { immutable: true },
    );
  }
}
```

Derive the scope from the authenticated principal. A client-supplied header is
a tenant-spoof unless a trusted gateway sets it.

Register it — without this the overlay is never attached, no scope reaches any
resolver, and every request is refused:

```ts
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: TenantScopeOverlay }],
})
export class AppModule {}
```

Define it unconditionally rather than only when a tenant is present: where no
overlay exists, something later in the request could define one. An overlay
that is always present and immutable cannot be supplied after the fact, and a
missing tenant then surfaces as a refusal from your resolver. Keep its values
flat: `{ immutable: true }` freezes one level deep.

### What a resolver has to check

`target` is the existing row the call is aimed at (`update`, `replace`,
`delete`, `deleteMany`, `softDelete`, `restore`, and `upsert` when its key names
a stored row); it is `undefined` for `create` and `createMany`, which name no
existing row, and for an `upsert` whose key matches none. `value` is what will
be written.

Both name the same row. For `update`/`replace` the repository pins it before a
resolver runs: it refuses data that would change the primary key, and refuses
an entity argument carrying anything but its own columns, so a relation on the
caller's entity cannot decide which row is written.

Check the right object for the operation:

- `update`/`replace` — `target` is the row; `value` is the data being written.
- `delete`/`deleteMany`/`softDelete`/`restore` — the driver acts on the *value*
  the resolver returns, so that is the one to check.
- `upsert` — the key comes from `value`, and `target` is the stored row that
  key names, or `undefined` when it names none. That lookup is by primary key
  alone and deliberately unscoped, because "no such row" and "exists, but not
  yours" are different answers and a resolver's own reads cannot tell them
  apart. So `target` here is not a row to trust — it answers "can the conflict
  clause fire?", and a present one still has to be checked.

`createMany` and `deleteMany` invoke the callback once per element, and a
refusal rejects the whole call. Handle `deleteMany` explicitly: falling
through to a permissive default removes rows by primary key across scopes.

Refuse by throwing a `RuntimeException` (or subclass). Repositories sit below
the transport layer, so `httpStatus` is a hint a transport-aware layer may
read, not a commitment this layer makes. A bare `HttpException` is rewrapped
into a generic 500.

### Startup checks

Structural only — nothing probes what a resolver decides:

- a resolver must be singleton-scoped, and so must everything it depends on.
  One declared request-scoped fails while the application is created; one
  that is request-scoped through a dependency fails when it initializes
  (`app.init()`), once every provider is built;
- no entity without a row scope has a relation to one with a row scope
  ([Relations and row scope](#relations-and-row-scope));
- no entity that sets `allowEagerRelations` has a relation into rows with a
  row scope, its own included;
- with `requireRowScopeDeclaration`, every entity carries a declaration;
- every scoped entity has a primary key column (with none, a write pre-check
  would reduce to the scope columns alone and match any row in scope), and each
  of its resolver's scope columns (`scope` on `RowScopeBase`). A resolver
  serving several entities is checked against each.

### Database row-level security

Row scope protects every repository call. To have the database hide other
tenants' rows too, even from SQL that bypasses the repository, add row-level
security behind it. This needs a driver and database that support it — today,
`nestjs-repository-typeorm` on Postgres, which sets the caller's tenant on
every transaction from the same `RowScopeCtx` overlay. See its
[Row-Level Security](../nestjs-repository-typeorm/README.md#row-level-security-postgres)
section.

## Write Policy

Row scope restricts *which* rows a caller may touch. Write policy restricts
*whether* a stored row may change at all.

```ts
RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmRepositoryModule,
      entities: [
        {
          key: 'statement-items',
          entity: StatementItem,
          writePolicy: { access: 'append-only', reason: 'financial lineage is retained' },
        },
      ],
    },
  ],
});
```

`create` and `createMany` stay open. Every operation that targets a stored row
— `update`, `replace`, `upsert`, `delete`, `deleteMany`, `softDelete`,
`restore` — is refused with `AppendOnlyViolationException` (`409`), even
when the version is stale, so you never see a misleading optimistic-lock
conflict.

`reason` is required so the decision is written down; nothing reads it.
Declare other entities `{ access: 'mutable' }`, which behaves like no
declaration but satisfies `requireWritePolicyDeclaration`.

### There is no escape hatch

Run migrations and backfills outside the repository.

### Correcting an append-only record

Append a new record that references the one it corrects, and resolve the chain
on read:

```ts
await items.create({
  correctedId: original.id,
  reason: 'rate applied from the wrong agreement version',
  amount: '27.00',
  currency: 'USD',
});
```

`resolveCorrectionChain` follows the corrections to the record currently in
effect. It joins the caller's transaction, and under row scope it stops at
the last record the caller can see:

```ts
const effective = await resolveCorrectionChain(items, original, { ctx });
```

Lineage points **forward only**: the original can't be updated, so it can't
get a `supersededBy` column. Find out whether a record has been superseded
by querying for one whose `correctedId` matches it.

The policy does not keep the chain well formed: `create` is not checked, so
two rows can share a `correctedId` or name a missing row. If each record may
be corrected only once, add a unique index on `correctedId` and a
self-referencing foreign key; your driver's README shows how. The database then
refuses a second correction of one record, or a correction of a missing one,
and the call throws `RepositoryDatabaseException` (`500`) carrying the
database's own error.

### Aggregates persist through `create`, not `upsert`

If your aggregate repository persists with `upsert`, switch append-only
aggregates to `create`: `upsert` is refused, because it updates the row when
the key exists.

**Never take the `id` from the request.** An id the application generates,
such as `randomUUID()` in an aggregate's factory, is fine. An id from the
request body lets two concurrent creates with the same `id` both pass
`create`'s existence check
([Create Inserts, It Never Updates](#create-inserts-it-never-updates)), and
the second can overwrite the first.

### What the guarantee covers

The refusal only covers writes made through the repository. Another entity's
write can't reach it either, because
[relation writes](#writing-relations) never leave that entity's table. Two
routes bypass it:

- **Foreign-key actions.** `ON DELETE CASCADE` or `SET NULL` from an
  append-only table lets a parent delete rewrite its rows. Declare those
  foreign keys `RESTRICT` or `NO ACTION`.
- **A direct `@InjectRepository` handle**, the same as for row scope.

### Write-policy startup checks

| Check | Always on | What it catches |
| --- | --- | --- |
| No soft-delete column on an append-only entity | yes | The entity has a soft-delete column, e.g. it extends an audited base entity. Use your driver's append-only base instead |
| Every entity declares a policy | `requireWritePolicyDeclaration` | An entity nobody decided about |

## Activity Log

Add `activity` to an entity to record who changed which of its rows, when, and
which columns:

```ts
@Entity()
export class Activity extends ActivityPostgresEntity {}

RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmRepositoryModule,
      entities: [
        { key: 'invoices', entity: Invoice, activity: { store: 'activity' } },
        {
          key: 'users',
          entity: User,
          activity: { store: 'activity', values: true, omit: ['passwordHash'] },
        },
        {
          key: 'activity',
          entity: Activity,
          writePolicy: { access: 'append-only', reason: 'activity log' },
          hooks: [ActivityActorHook],
        },
      ],
    },
  ],
});
```

Every write then adds one record per row it changes. The store is an
append-only entity extending your driver's activity base entity; several
entities can share one.

| `activity` option | Description |
| --- | --- |
| `store` | The `forRoot()` key of the store |
| `values` | Also record each changed column's new value. Off by default |
| `omit` | Columns whose values are never recorded. Only with `values` |

The entity needs a single-column primary key.

### What a record holds

| Column | Holds |
| --- | --- |
| `entityKey` | The written entity's `forRoot()` key |
| `urn` | The written entity's storage identity |
| `operation` | `create`, `update`, `replace`, `upsert`, `delete`, `softDelete` or `restore` |
| `recordId` | The written row's primary key, as a string |
| `changed` | The columns the write changed (below) |
| `values` | With `values: true`, each changed column's new value, less `omit`; otherwise `null` |
| `occurredAt` | When the write happened |
| `correlationId` | The request's `x-correlation-id` header, unchecked, or a generated id; `null` outside a request |

| Operation | `changed` |
| --- | --- |
| `create`, `createMany`, `replace` | Every column of the stored row |
| `update`, `upsert` | The columns you sent, plus any your hooks or row scope added, less the primary key |
| `delete`, `deleteMany` | None |
| `softDelete`, `restore` | The soft-delete column |

On a create or replace, `changed` includes the columns the database set, such
as the version and dates. On an update or upsert, it doesn't, unless you sent
them. An
`upsert` doesn't say whether it inserted or updated. A column's old value is in
the row's previous record.

### Adding the actor

Set the actor, and any column you add to the store, in a hook on the store:

```ts
@RepoHook()
export class ActivityActorHook {
  @BeforeCreateMany()
  async stampActor(
    records: DeepPartial<Activity>[],
    ctx?: PlainLiteralObject,
  ): Promise<DeepPartial<Activity>[]> {
    const actorId = principalOf(ctx)?.id ?? null; // null: a job or seeder
    return records.map((record) => ({ ...record, actorId }));
  }
}
```

Classify records the same way, for example a `category` column set from
`record.entityKey`.

Your `@UseHooks()` route hooks run on store writes too. A route hook that adds
a column of your entity must skip the store, or the store write fails: limit it
to your entity as in [Scoped Hooks](#scoped-hooks).

### Scoped entities

A scoped entity's records copy its rows, so its store must declare `rowScope`
too. Scope the store, and each record is stamped with the caller's scope, such
as their `tenantId`, and read back only by that scope. Or declare it
`{ access: 'public', reason }` if every reader of the store may see every
scope's records.

### Transactions

- **Inside your transaction**, the change and its record commit or roll back
  together.
- **Without one**, if the record can't be stored the call throws
  `ActivityWriteException`, and the change stays stored, unrecorded.
- **With the store on another datasource**, they commit separately even inside
  a transaction.

To record every change, write inside a transaction and keep the store on the
entity's datasource.

### Reading a row's history

```ts
const history = await activity.find({
  where: Where.and(
    Where.eq('entityKey', 'invoices'),
    Where.eq('recordId', invoice.id),
  ),
  ...OrderBy.order(OrderBy.asc<Activity>('occurredAt')),
});
```

The activity base entity indexes `(entityKey, recordId)` for this lookup. The
store's row scope and hooks apply as for any entity.

### What is not recorded

- Refused or failed writes, and reads.
- A `softDelete` of a row that is already soft-deleted. A `restore` is always
  recorded, even of a row that wasn't deleted.
- Writes outside the repository: migrations, raw SQL, a direct
  `@InjectRepository` handle. They leave gaps in a row's history.

### Personal data and retention

Records can't be deleted through the repository. Leave `values` off or `omit`
personal columns, or pseudonymize them in a store hook. Expire old records with
a scheduled job outside the repository.

### Activity startup checks

| Check | What it catches |
| --- | --- |
| Single-column primary key | The recorded entity's key has several columns, or none |
| Registered store | `store` names no `forRoot()` entry |
| Not its own store | The entity names itself as the store |
| Unrecorded store | The store declares `activity` too |
| Append-only store | The store isn't `{ access: 'append-only' }` |
| Scoped entity, declared store | The entity is scoped and its store declares no `rowScope` |
| Store columns | The store lacks an `ActivityInterface` column. Extend your driver's activity base entity |
| `omit` | `omit` without `values`, or a column the entity doesn't have |

## Durable Messaging

`@concepta/nestjs-repository/optional/outbox` publishes
[`@nestjs/outbox`](https://www.npmjs.com/package/@nestjs/outbox) messages,
and records inbox deliveries, in the same transaction as your repository
writes. A message commits or rolls back with the writes beside it, and a
redelivered message runs its work once. Install `@nestjs/outbox`, and use a
driver that provides durable support from its own `optional/outbox` entry
point.

```ts
import { DurableMessagingModule } from '@concepta/nestjs-repository/optional/outbox';

@Module({
  imports: [
    RepositoryModule.forRoot({ /* ... the 'orders' registration ... */ }),
    DurableMessagingModule.forRoot({
      key: 'orders',              // the registration whose datasource holds the outbox
      driver: YourDriverDurable,  // from your driver's optional/outbox
      outbox: { retry: 10 },      // passed to OutboxModule.forRoot()
    }),
  ],
})
export class AppModule {}
```

Publish next to your writes, inside a transaction scope:

```ts
await this.txScope.run(ctx, async (txCtx) => {
  await this.orders.create(order, { ctx: txCtx });
  await this.durable.publish(txCtx, [
    { topic: 'order.placed', key: order.id, payload: { orderId: order.id } },
  ]);
});
```

Run a delivery's work once:

```ts
const result = await this.durable.once(ctx, 'billing', message.id, async (txCtx) => {
  // repository writes here join the same transaction as the inbox record
});
// result is { duplicate: true } when this consumer already processed the message
```

A handler that throws is retried for you, with backoff. When you know a
retry cannot help, throw `NonRetryableMessageError` from `@nestjs/outbox`
and the message goes straight to the dead letters for review:

```ts
@OnOutboxMessage('provider.callback', { consumer: 'billing', inbox: false })
async handle(payload: CallbackPayload, { message }: OutboxHandlerContext) {
  await this.durable.once(new AppContextHost(), 'billing', message.id, async (txCtx) => {
    const invoice = await this.invoices.findOne({
      where: Where.eq('id', payload.invoiceId),
      ctx: txCtx,
    });
    if (invoice?.status === 'void') {
      // a callback for a voided invoice will not succeed on a retry
      throw new NonRetryableMessageError(`invoice ${payload.invoiceId} is void`);
    }
    // ...apply the callback
  });
}
```

Set `inbox: false` on handlers that use `once`; `once` already records the
delivery.

Leave a lost optimistic lock, or a record that has not arrived yet, to be
retried: those usually succeed on a later attempt. To decide by exception
type instead, set `retryIf` and the number of attempts:

```ts
DurableMessagingModule.forRoot({
  key: 'orders',
  driver: YourDriverDurable,
  outbox: {
    retry: {
      attempts: 10,
      retryIf: (error) => !(error instanceof InvoiceVoidedException),
    },
  },
});
```

Once you have fixed the cause, `requeue` the dead letter with
`OutboxDeadLetters`. Consumers that already handled it are not repeated;
only the work that failed runs again.

What to know:

- `publish` needs a transaction scope; outside one it throws. The relay is
  woken when the scope commits.
- `once` opens a scope, or joins the one `ctx` is in. If `work` throws, the
  whole scope rolls back, including a joined caller's earlier writes, and the
  caller's own `run()` throws `TransactionScopeFailedException`.
- Startup refuses, with `UnsupportedDurableDriverException`, a key nothing is
  registered under and a registration its driver cannot carry: no
  transactions, or a database `@nestjs/outbox` has no store for.
- Import `DurableMessagingModule.forRoot()` once per application. A second
  one fails startup.
- Delivery is at least once: a handler that does not use `once` must be
  idempotent.
- `OutboxInbox`, `OutboxDeadLetters` and `OutboxRelay` from `@nestjs/outbox`
  are injectable as they are, for retention, dead letters and stats.

## Repository Registry

`forRoot()` refuses two entries with the same key
(`RepositoryDuplicateKeyException`), and `RepositoryRegistryService` refuses
two that read the same rows (`RepositoryDuplicateUrnException`), each naming
the registrations that conflict.

```ts
RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmRepositoryModule,
      entities: [
        { key: 'users', entity: UserEntity },
        { key: 'users', entity: AdminEntity }, // duplicate key!
      ],
    },
  ],
});
// Throws: Duplicate repository keys: "users" (registered for UserEntity, attempted for AdminEntity)
```

`forRoot()` is imported once. Importing it a second time fails at startup.

## Federation

Mark a relation `federated: true` to read it through the related entity's own
repository instead of a database join, for example when the related entity
lives in another database. You query it like any other relation, with `join`
and `Where.rel()`, on `find`, `findOne`, `count` and `findAndCount`:

```ts
RepositoryModule.forRoot({
  drivers: [
    {
      driver: TypeOrmRepositoryModule,
      entities: [
        { key: 'users', entity: UserEntity, relations: { posts: { federated: true } } },
        { key: 'posts', entity: PostEntity, dataSource: 'content' },
      ],
    },
  ],
});

const [page, total] = await users.findAndCount({
  where: Where.and(
    Where.eq('companyId', 7),
    Where.rel('posts', Where.eq('published', true)),
  ),
  join: [{ relation: 'posts' }],
  order: [{ field: 'name', order: 'ASC' }],
  take: 20,
  skip: 20,
  ctx,
});
```

`page` is the second page of company 7's users who have a published post,
`total` counts all of them, and each user's `posts` holds their published
posts, as a join would return:

- **Pages and totals are exact.** The users' own database pages, sorts and
  counts the read, with the published-post condition already in its query.
- **The related rows are read the way their own repository reads them**,
  under your `ctx`, so their row scope, soft delete and hooks apply.
  `withDeleted` reaches them too.
- **A to-one relation holds its row or `null`, a to-many its rows or `[]`.** A
  to-one that more than one related row points at throws.
- **A many-to-many reads through its junction**, so register an entity for the
  junction table in `forRoot()`. Startup fails if it is not registered.
- **The related repository is the one registered for the related entity**,
  wherever it lives. The application won't start if no registration, or more
  than one, has that entity's name, if its columns differ from the ones the
  relation declares, or if either side lacks the column the relation is read
  by.

### What is refused

A query a federated relation cannot answer exactly is refused with a `400`
`FederationException` naming the reason:

| Query | Instead |
| --- | --- |
| A sort by a federated relation's column | Sort by a column of the entity you read |
| `Where.isNull()` on a federated relation | Filter on a value the related row has: a join would also match a user with no related row at all, which reading the related rows cannot see |
| An `OR` between a federated relation and any other condition | Combine them with `AND`, or keep the `OR` within the one relation |
| A `select` without the column the relation is read by | Select it too: the entity's key, or its foreign key for a relation it holds |

### `maxKeys`

Every federated query carries at most `federation.maxKeys` keys (default
`1000`):

```ts
RepositoryModule.forRoot({ federation: { maxKeys: 5000 }, drivers: [/* … */] });
```

- **A join** attaches its relation to rows holding up to `maxKeys` distinct
  values of the column it is read by, the users' `id` here. Read a larger page
  and it is refused.
- **A many-to-many** also reaches at most `maxKeys` related rows from the rows
  read, however they are shared among them. A user with more tags than that is
  refused even on its own: raise `maxKeys` for it.
- **A filter** needs the conditions on one side to match no more than
  `maxKeys` rows. In the example, either company 7 has at most `maxKeys` users,
  or there are at most `maxKeys` published posts. When both sides match more,
  the read is refused: narrow the conditions on either side.

What a read costs:

| Read | Queries |
| --- | --- |
| A join | The read itself, plus one per federated relation (two for a many-to-many) |
| A filter on federated relations | The join's queries, plus up to two for the entity's matching keys and up to two per filtered relation (four for a many-to-many) |

The column a relation is read by must hold the same type of value on both
sides, since keys are matched as they are read: a `1` from one database never
matches a `'1'` from another.

### Two reads, not one

The entity's rows and the related rows are separate reads, possibly of separate
databases, so they are not one snapshot. A related row changed between the two
can show in its earlier state. Within one call the page and the total always
agree.

### distinctFilter

`distinctFilter` narrows which related rows belong to the relation, on every
join and filter. Below, each user's `posts` holds only their primary post:

```ts
relations: {
  posts: {
    federated: true,
    distinctFilter: Where.eq('isPrimary', true),
  },
},
```

The application won't start if `distinctFilter` uses `Where.rel()`, names a
column the related entity doesn't have, or is set on a relation that is not
federated.

## Injecting Repositories

Use `@InjectDynamicRepository()` to inject a repository registered in
`forRoot()`, from a module that imports its key with
[`forFeature()`](#forfeature):

```ts
import { InjectDynamicRepository } from '@concepta/nestjs-repository';

@Injectable()
export class OrderService {
  constructor(
    @InjectDynamicRepository('orders')
    private readonly orderRepo: RepositoryInterface<Order>,
  ) {}

  async findAll() {
    return this.orderRepo.find();
  }
}
```

The injection token is derived from the `key` provided in
`RepositoryProviderOptions` via `getDynamicRepositoryToken(key)`, which is
also exported for manual provider wiring.

## Exceptions

| Exception | Description |
| --- | --- |
| `RepositoryQueryException` | Wraps any opaque error thrown by a repository operation or its hook pipeline, and is thrown when a driver returns a property the call did not ask for — see [What a result holds](#what-a-result-holds) — or a `createMany`/`deleteMany` result without one row per input. `RuntimeException` subclasses (e.g. `OptimisticLockException`) pass through unwrapped |
| `RepositoryDatabaseException` | A `RepositoryQueryException` for an error the database raised, such as a foreign key or unique constraint it refused. `context.database` and `context.code` name the database and its own error code, for logs and diagnosis |
| `OptimisticLockException` | An `update`, `replace`, `delete`, `softDelete` or `restore` targeted a stale version — the row was modified by another request since it was read |
| `RepositoryDuplicateKeyException` | Two `forRoot()` entries share a key |
| `RepositoryDuplicateUrnException` | Two registrations read the same rows (the same URN), detected at startup |
| `EntityAlreadyExistsException` | A `create`/`createMany` supplied a primary key that already names a row — create inserts, it never updates. Use `upsert` for insert-or-update |
| `PartialPrimaryKeyException` | A `create`/`createMany` supplied only part of a composite primary key. A partial key cannot be looked up, so nothing can tell whether it is taken. Supply every key column, or none for a generated key |
| `RelationWriteException` | A write payload carried a relation not marked `cascade: true`. An owning relation is written through its foreign key column; any other through the related entity's own repository — see [Writing relations](#writing-relations) |
| `CascadeWriteException` | A cascade relation in a write payload held something other than its rows: a list of objects for a to-many relation, an object or `null` for a to-one — see [Cascading writes](#cascading-writes) |
| `UnknownColumnException` | A write payload, or a read's `select`, `where` or `order`, named a property that is not a column of the entity; the message lists them — see [Writing relations](#writing-relations) and [What a read may name](#what-a-read-may-name) |
| `InvalidColumnValueException` | A write payload carried a function in place of a column value, or an object in a primary or foreign key column; the message lists the columns |
| `TransactionTimeoutException` | Transaction exceeded timeout duration |
| `TransactionClosedException` | A settled scope was used again — `getOrStart`, `enter`, `onCommit`, or `onRollback` after close |
| `TransactionHeuristicCommitException` | A multi-datasource commit failed after at least one datasource had already committed |
| `TransactionReadOnlyConflictException` | A joining `run()`/`runReadOnly()` call's `readOnly` option conflicts with the scope it's joining |
| `TransactionScopeFailedException` | A participant's own operation succeeded, but its shared scope had already failed via a sibling |
| `FederationException` | A federated read that cannot be answered exactly ([What is refused](#what-is-refused), [`maxKeys`](#maxkeys)), or a to-one that more than one related row points at. An error from the related repository reaches you as it threw it |
| `RepositoryBootException` | One or more structural repository checks failed at startup, such as a foreign key with no column of its own; the message lists every failure. Also thrown for a `forFeature()` key `forRoot()` did not register |
| `RepositoryUnboundException` | A repository built outside `RepositoryModule.forRoot()` was asked to serve an operation. Its declarations were never bound, so it refuses rather than run without them |
| `RowScopeUnboundException` | A repository whose entity is declared scoped was asked to serve an operation before its resolver was attached — used from another provider's constructor during startup. It refuses rather than running unscoped |
| `RowScopeBootException` | One or more structural row scope checks failed at startup; the message lists every failure |
| `AppendOnlyViolationException` | An operation would have changed a stored row on an entity declared append-only. Append a correcting record instead |
| `WritePolicyBootException` | One or more structural write-policy checks failed at startup; the message lists every failure |
| `ActivityWriteException` | A write's activity record couldn't be stored. A refusal by the store, such as its row scope, keeps its status (a `403` stays a `403`); anything else is a `500`. Without a transaction, the write itself is already stored — see [Transactions](#transactions) |
| `ActivityBootException` | One or more activity checks failed at startup; the message lists every failure — see [Activity startup checks](#activity-startup-checks) |
| `CorrectionChainDepthException` | `resolveCorrectionChain` found more corrections than `maxDepth` (default 100); raise `maxDepth` if the chain is genuinely that long |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-repository` | Module, adapter, repository interfaces, Where/OrderBy builders, transaction management, hooks, federation, decorators, exceptions |
| `@concepta/nestjs-repository/optional/outbox` | `DurableMessaging`, `DurableMessagingModule`, `DurableMessagingOptionsInterface`, `DurableDriverInterface`, `UnsupportedDurableDriverException`. Requires `@nestjs/outbox` |
| `@concepta/nestjs-repository/testing` | `createMockTransaction`, `createMockRepository`, `MockTransactionHandle` |
