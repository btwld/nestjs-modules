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

### forRoot

`forRoot()` registers the module **globally** and sets up the transaction
infrastructure (factory registry, scope, runner, interceptor).

```ts
import { RepositoryModule } from '@concepta/nestjs-repository';

@Module({
  imports: [
    RepositoryModule.forRoot({
      defaultTimeout: 30000, // transaction timeout in ms (default)
    }),
  ],
})
export class AppModule {}
```

### forRootAsync

```ts
@Module({
  imports: [
    RepositoryModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        defaultTimeout: configService.get('TX_TIMEOUT', 30000),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### forFeature

`forFeature()` registers repository providers for specific entities. It
delegates to the driver module's own `forFeature()` method and automatically
registers entities in the repository registry and transaction factories.

```ts
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

@Module({
  imports: [
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: 'orders', entity: Order },
        { key: 'customers', entity: Customer },
      ],
    }),
  ],
})
export class OrderModule {}
```

Each entity registration creates a dynamic repository provider that can be
injected by key using `@InjectDynamicRepository()`.

Two further options matter when an entity is scoped:

| Option | Description |
| --- | --- |
| `entities[].rowScope` | Declares the entity `{ access: 'scoped', resolver }` or `{ access: 'public', reason }` — see [Row Scope](#row-scope) |
| `imports` | Modules exporting providers this registration must resolve. **Required** when any entity declares a resolver: the resolver is bound inside the module `forFeature()` returns, which cannot see providers declared alongside it |

```ts
RepositoryModule.forFeature({
  module: TypeOrmRepositoryModule,
  imports: [OrdersRowScopeModule], // exports OrdersRowScope
  entities: [
    {
      key: 'orders',
      entity: Order,
      rowScope: { access: 'scoped', resolver: OrdersRowScope },
    },
  ],
});
```

### Settings

```ts
interface RepositoryModuleOptionsInterface {
  defaultTimeout?: number; // Transaction timeout in milliseconds (default: 30000)
  requireRowScopeDeclaration?: boolean; // Fail startup on an undeclared entity (default: false)
}
```

`requireRowScopeDeclaration` turns "nobody declared this entity" into a
startup failure rather than a silent omission. Off by default because whether
an undeclared entity is a mistake depends on the deployment: an application
that scopes everything wants it on, one that scopes a handful of entities
among many does not — see [Row Scope](#row-scope).

## Architecture Overview

```text
Application Code
  |
RepositoryModule (forRoot / forFeature)
  |
  +-- RepositoryAdapter (abstract, driver-agnostic)
  |     Concrete implementations: TypeOrmRepository, etc.
  |
  +-- Transaction Layer
  |     TransactionScope -> TransactionManager -> TransactionFactory
  |
  +-- Hook System
  |     @RepoHook + @BeforeCreate / @AfterFind / etc.
  |
  +-- Registry
        RepositoryRegistryService (duplicate key detection at bootstrap)
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
- **Registry** -- validates at application bootstrap that no duplicate
  repository keys exist across features

## Repository Adapter

`RepositoryAdapter` is the abstract base class that all driver-specific
repository implementations extend. It implements `RepositoryInterface` with
a template-method design: the public operations (`find`, `create`, `update`,
etc.) are concrete wrappers that run the hook pipeline, each delegating to a
protected abstract `do*` method that the driver implements.

### Abstract Members

Concrete implementations must provide these protected `do*` methods, plus
the abstract `transform`/`merge` utilities and the `metadata` property:

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
| Utility | `transform` | `(entityLike) => Entity` |
| Utility | `merge` | `(mergeIntoEntity, ...entityLikes) => Entity` |
| Utility | `metadata` | `RepositoryMetadataInterface<Entity>` (abstract property) |

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

A primary key supplied through a relation object (`{ account: { id } }`) counts
as supplied — the guard reads both routes, because a driver resolves the column
from the relation when the scalar is absent and prefers it.

### Concrete Members

The public `find`, `findOne`, `count`, `findAndCount`, `create`,
`createMany`, `update`, `upsert`, `replace`, `delete`, `deleteMany`,
`softDelete`, and `restore` methods are concrete — each runs the
[hook pipeline](#hook-pipeline) around the matching `do*` method.

| Member | Visibility | Description |
| --- | --- | --- |
| `prepare(dto)` | public | Returns `dto` unchanged if it is already an entity instance, otherwise `Object.assign(new entityType(), dto)` |
| `getPrimaryColumns()` | protected | Get primary key column names from metadata (subclass-author API) |
| `getVersionColumn()` | protected | Get the optimistic-locking version column name from metadata, if any — backs both the in-request lock and `expectedVersion` (subclass-author API) |
| `getDeleteDateColumn()` | protected | Get the soft-remove date column name from metadata, if any (subclass-author API) |
| `toDnf(clause)` | protected | Convert `WhereClause` AST to Disjunctive Normal Form (subclass-author API) |
| `runHooks(methodKey, payload, ctx, filter?)` | protected | Execute repository hooks for a lifecycle event; `filter` selects by hook metadata, which is how `{ replace: true }` routing works (subclass-author API) |
| `resolveJoinClauses(join?)` | protected | Validate join relation names against entity metadata (subclass-author API) |

### Implementing a Repository

```ts
import { RepositoryAdapter } from '@concepta/nestjs-repository';

class MyDriverRepository<Entity extends PlainLiteralObject>
  extends RepositoryAdapter<Entity> {
  readonly metadata = { /* ... */ };

  protected async doFind(options?) {
    return this.repo.find(options);
  }

  protected async doCreate(entity, options?) {
    return this.repo.save(entity);
  }

  // ... implement the remaining do* methods, transform, and merge
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
    // entity is soft-deleted — restore it first, or use { force: true }
  }
}
```

Pass `{ force: true }` to bypass the guard for server-side carve-outs (e.g.
pre-purge PII masking, admin data-integrity corrections). It is not exposed
over HTTP by `nestjs-crud` — only server-side callers can opt in.

Soft-deleting an already-soft-deleted row is a no-op rather than an error:
`softDelete()` returns the entity unchanged instead of re-stamping its delete
date, since a retried HTTP DELETE must not fail.

### Expected Version

The in-request optimistic lock (see
[nestjs-repository-typeorm's Optimistic Locking](../nestjs-repository-typeorm/README.md#optimistic-locking))
guards a read-then-write inside one request, but two requests that each
re-read before writing both pass it, since each compares against its own
fresh value. `expectedVersion` closes that gap: pass the version the caller
last read, and `update`, `replace`, `delete`, `softDelete`, and `restore`
all reject a mismatch with `OptimisticLockException` (409 Conflict) —
enforced once in `RepositoryAdapter`, for every driver.

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
Passing `versionGuard` directly is a no-op — the adapter always overwrites
it with its own resolution.

## Relations and Joins

Repository find options accept a `join` array of `JoinClause` entries to load
related entities alongside the root query.

### JoinClause

Each `JoinClause` describes how to join a related entity:

```ts
interface JoinClause {
  relation: string;           // relation name (must match entity metadata)
  joinType?: 'LEFT' | 'INNER';  // default: 'LEFT'
}
```

`joinType` is honoured by federation, which implements `INNER` by requiring the
related row to exist. The TypeORM driver renders joins through TypeORM's
`relations` find option, which is always a LEFT JOIN, so it **refuses** an
`INNER` clause on a non-federated relation rather than silently returning the
rows you asked to exclude. Filter on the related column instead, or declare the
relation federated.

`resolveJoinClauses()` validates each clause's relation name against
`metadata.relations` and refuses an unknown one with a `400`; it does not alter
the clauses. Structural relation data (`on`, `through`, `cardinality`) lives on
`metadata.relations`, where the driver and federation read it — it is never
attached to a join clause.

### Join Helper

The `Join` helper builds `JoinClause` arrays:

```ts
import { Join } from '@concepta/nestjs-repository';

// Load a single relation (LEFT join by default)
const [users, total] = await userRepo.findAndCount({
  ...Join.join(Join.left('company')),
});
// users[0].company → Company | null

// Multiple relations with different join types
const [users, total] = await userRepo.findAndCount({
  ...Join.join(
    Join.left('posts'),
    Join.inner('company'),
  ),
});

// Many-to-many (junction configured in relation metadata)
const [users, total] = await userRepo.findAndCount({
  ...Join.join(Join.left('roles')),
});
```

### Join Methods

| Method | Description |
| --- | --- |
| `left(relation)` | LEFT JOIN (default — includes rows with no match) |
| `inner(relation)` | INNER JOIN (excludes rows with no match) — federated relations only; see above |
| `join(...clauses)` | Wrap join clauses into `{ join: clauses }` for passing to `find()` |

### Filtering by Relations

Use `Where.rel()` to filter by fields on a related entity. The relation
must be included in the join:

```ts
const w = Where.for<UserEntity>();

const [users, total] = await userRepo.findAndCount({
  ...Join.join(Join.left('posts')),
  ...w.where(
    w.and(
      w.eq('status', 'active'),
      w.rel('posts', Where.eq<PostEntity>('published', true)),
    ),
  ),
});
```

### Sorting by Relations

Use `OrderBy.rel()` to sort by fields on a related entity:

```ts
const o = OrderBy.for<UserEntity>();

const [users, total] = await userRepo.findAndCount({
  ...Join.join(Join.left('posts')),
  ...o.order(
    o.rel('posts', OrderBy.desc<PostEntity>('createdAt')),
    o.asc('name'),
  ),
});
```

### Relation Metadata

Relation metadata is populated automatically by the ORM driver (e.g.,
`TypeOrmRepository` reads TypeORM's `RelationMetadata`). You can also
configure per-relation behavior in `forFeature()`:

```ts
RepositoryModule.forFeature({
  module: TypeOrmRepositoryModule,
  entities: [{
    key: 'users',
    entity: UserEntity,
    relations: {
      posts: { federated: true },        // use separate queries
      company: { onDelete: 'delegate' }, // defer to DB cascade settings
    },
  }],
});
```

Relations marked `federated: true` use separate queries instead of SQL
JOINs. See [Federation](#federation) for details.

## Where Clause Builder

The `Where` helper builds ORM-agnostic
`WhereClause` AST objects that `RepositoryAdapter` implementations translate
into driver-specific queries.

### How Translation Works

1. The `Where` helper builds a `WhereClause` AST (tree of conditions and
   compound operators)
2. `RepositoryAdapter.toDnf()` flattens the AST into Disjunctive Normal Form
   (an OR of ANDs)
3. The concrete driver (e.g., `TypeOrmRepository`) translates each AND-branch
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

// Pattern matching
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
  ...Join.join(Join.left('customer')),
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

The `OrderBy` helper builds ORM-agnostic
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
  ...Join.join(Join.left('posts')),
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
  create(): TransactionInterface;
  readonly supportsConcurrentTransactions?: boolean;
}
```

Factories are registered automatically when using `RepositoryModule.forFeature()`
with a driver module that returns `transactionFactories` in its
`DynamicRepositoryModule`.

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

// Typed token for the tenant id — attached to the request context by a
// ContextOverlayInterceptor registered as an APP_INTERCEPTOR (see nestjs-core's
// Context System docs for the interceptor that populates this).
export const TenantCtx = new OverlayRef<'withTenant', { tenantId: string }>(
  'withTenant',
);

@RepoHook()
@Injectable()
export class TenantScopeHook {
  // Scoped reads: hook output replaces the query options wholesale, so a
  // caller's own `where` clause is ANDed with the tenant filter, never
  // dropped — the two combine rather than one overriding the other.
  @BeforeFind()
  async addTenantFilter(
    options: RepositoryFindOptions<OrderEntity>,
    ctx: AppContextInterface,
  ): Promise<RepositoryFindOptions<OrderEntity>> {
    // `require()` throws when the overlay is absent, so a call that cannot
    // identify a tenant is refused rather than reading across all of them.
    const tenant = ctx.require(TenantCtx).withTenant();

    const condition = Where.eq('tenantId', tenant.tenantId);
    return {
      ...options,
      where: options.where ? Where.and(options.where, condition) : condition,
    };
  }

  // Authoritative write: { replace: true } makes this hook's output win over
  // whatever the caller supplied — a caller-provided `tenantId` in the
  // request body cannot override the stamp. Without { replace: true }, the
  // default merge semantics would let a caller's own tenantId win instead —
  // see "Hook Pipeline" below. This is the isolation-relevant half; the
  // read-side filter alone is not enough to keep tenants apart.
  @BeforeCreate({ replace: true })
  async stampTenant(
    data: DeepPartial<OrderEntity>,
    ctx: AppContextInterface,
  ): Promise<DeepPartial<OrderEntity>> {
    const tenant = ctx.require(TenantCtx).withTenant();

    return { ...data, tenantId: tenant.tenantId };
  }
}
```

### Wiring Hooks

Register the hook on the entity it belongs to, in `forFeature`. Two things
have to be true for it to run:

1. **`CoreModule.forRoot()`** (or `.register()`) is imported. It provides
   `HookResolverService`.
2. **The hook class is listed in `providers`** of some module, so Nest's DI
   can resolve it. Any module will do — it is resolved with
   `moduleRef.get(hook, { strict: false })`, so no extra `imports` entry is
   needed.

```ts
import { Module } from '@nestjs/common';
import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

@Module({
  imports: [
    CoreModule.forRoot(), // 1. required for any hook to run
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        { key: 'orders', entity: Order, hooks: [TenantScopeHook] },
      ],
    }),
  ],
  providers: [TenantScopeHook], // 2. required so DI can resolve it
})
export class OrderModule {}
```

A hook registered this way runs on **every** call that reaches the entity —
an HTTP route, another entity's hook calling this repository, a queue
consumer, a seeder, a test. Nothing further is needed outside HTTP.

A declared hook that could never run is a startup failure
(`HookBootException`), not a silent no-op. Caught at boot: a missing
`CoreModule`, a declaration nothing bound, a class listed twice for one
entity, a hook missing its `@RepoHook()`, one decorated for another
subsystem, and one the container cannot resolve. The first two are also
refused on the call itself, which is what covers an app that never reaches the
startup checks.

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
outside HTTP, so the hook does not run for a queue consumer, a seeder or a
test; and it is read by every repository call that receives that `ctx`, so an
ungated hook also runs for other entities written during the request. See
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

To target one entity, register the hook on it — `hooks:` in `forFeature`
reaches that entity and nothing else.

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
rowScope: { access: 'scoped', resolver: OrdersRowScope }
rowScope: { access: 'public', reason: 'shared reference data, not tenant-owned' }
```

`public` requires a reason because it is a decision someone has to defend
later. Undeclared is allowed unless the deployment sets
`requireRowScopeDeclaration`.

### The resolver

```ts
// Whatever your overlay carries. Snippets further down read `role` and
// `region` off it, so they are declared here too.
interface TenantScope {
  tenantId: string;
  role?: string;
  region?: string;
}

@Injectable()
export class OrdersRowScope implements RowScopeInterface<TenantScope> {
  constructor(
    @InjectDynamicRepository('orders')
    private readonly orders: RepositoryInterface<Order>,
  ) {}

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

A resolver may read back through the repository it scopes — that nested read
is itself scoped, which is the point. Injecting your own repository is not a
circular dependency: repository tokens come from a global module, and a
repository never depends on its resolver.

### `RowScopeBase`

Most resolvers are the same shape: one or more columns carry the scope value.
`RowScopeBase` implements that, so a resolver is usually just configuration:

```ts
@Injectable()
export class OrdersRowScope extends RowScopeBase<Order, TenantScope> {
  constructor(
    @InjectDynamicRepository('orders')
    orders: RepositoryInterface<Order>,
  ) {
    super(orders, { scopeKey: 'tenantId', column: 'tenantId', label: 'Order' });
  }
}
```

It implements four rules and nothing else:

1. **Reads inject the scope columns into the `WHERE`.**
2. **Writes naming an existing row pre-check** with the primary key *and* the
   scope columns in the `WHERE`. The pre-check's own clause decides, so a miss
   is a `404` — including a row the caller can read through a widened
   `scopeQuery` but may not write.
3. **`create` is new data** — the scope columns are stamped onto it. There is no
   pre-check: a create names no existing row, and the adapter
   [already refuses](#create-inserts-it-never-updates) one whose key is taken,
   whatever scope owns it. An `upsert` whose key names no stored row is new data
   on the same reasoning, and is stamped rather than pre-checked; one whose key
   names a row falls under rule 2.
4. **The scope columns take precedence** over any same-named value in the
   payload, and a mismatch is refused rather than rewritten — by whichever route
   the value arrives, including a relation object that resolves to the column.

`label` defaults to `Row`. Scope values and primary keys may be strings or
numbers. Primary key columns are read from the entity's own metadata, so
composite primary keys work too — a key counts as naming a row only when every
primary column is present.

It assumes **every scoped entity carries its own scope column**, so scope is
decided per row without following a relation. That assumption is what makes the
rest simple, and what makes a join safe (see
[Relations and row scope](#relations-and-row-scope)).

#### Composite scope

Override `resolveScope` to return more than one column. The same values are used
for the read predicate, the write pre-check and the stamp, so they cannot drift
apart:

```ts
protected override resolveScope(
  scope: TenantScope | undefined,
): RowScopeValues<Order> {
  const { tenantId, region } = scope ?? {};

  if (typeof tenantId !== 'string' || typeof region !== 'string') {
    this.refuse(HttpStatus.FORBIDDEN, 'No scope on the request context');
  }

  return { tenantId, region };
}
```

Returning no columns is treated as a misconfiguration rather than as a
superuser: such a principal reads nothing (`Where.never()`) and writes nothing.

A subclass overriding `resolveScope` supplies no `scopeKey`/`column`, and none is
required of it.

#### Reading more broadly than you write

A principal that reads every scope but writes only its own — an internal
dashboard — is a `scopeQuery` override:

```ts
override scopeQuery<Options extends { where?: WhereClause }>(
  params: RowScopeQueryParams<Options, TenantScope>,
): Options {
  if (params.scope?.role === 'admin') return params.options;

  return super.scopeQuery(params);
}
```

That cannot widen a write. The write pre-check carries the scope columns in its
own `WHERE`, so the override leaves every write confined to the caller's own
scope, and a `create` is still stamped with it.

#### Checks this class cannot make

A foreign key that must point inside the caller's scope is the common case:
nothing about a scoped read on the child says which parent a child points at.
Override `scopeWrite`, calling `super` first. Note the constructor: `RowScopeBase`
keeps the repository it was given private, so a subclass that needs to read —
either its own rows or another entity's — injects what it needs itself:

```ts
@Injectable()
export class OrderLinesRowScope extends RowScopeBase<OrderLine, TenantScope> {
  constructor(
    @InjectDynamicRepository('order-lines')
    private readonly orderLines: RepositoryInterface<OrderLine>,
    @InjectDynamicRepository('orders')
    private readonly orders: RepositoryInterface<Order>,
  ) {
    super(orderLines, {
      scopeKey: 'tenantId',
      column: 'tenantId',
      label: 'Order line',
    });
  }

  override async scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value, TenantScope>,
  ): Promise<Value> {
    const scoped = await super.scopeWrite(params);

    // `transform` settles an `order` relation *object* into the `orderId`
    // column it backs, so one read covers both the scalar and the object. A
    // bare id (`order: '…'`) reads as undefined, so the driver fails the
    // write.
    const orderId = this.orderLines.transform(scoped).orderId;
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

Read a column through `transform` rather than off the payload directly. A column
can be supplied as its own scalar or through a relation object that resolves to
it, and a driver prefers the relation — so reading the payload misses the
relation route entirely. `transform` is the driver's own materialization and
answers what the write will actually use.

One foot-gun: `transform` does not fill database defaults, but it *does* apply
class-field initializers. `@Column() tenantId: string = 'default'` makes every
`create` refuse as scoped elsewhere. It fails closed, but the cause is not
obvious.

#### Relations and row scope

A `join` — and a `Where.rel()` filter — is resolved by the driver in a single
statement, so **the joined entity's resolver never runs**. Row scope does not
apply to it, by design.

That is safe under the model above, and the safety comes from the write side:

1. every scoped entity carries its own scope column, so each row's owner is
   decided without following a relation;
2. a resolver checks the foreign keys it owns when a row is *written*
   ([above](#checks-this-class-cannot-make));
3. so by the time anything is read, every row already points inside its own
   scope, and a join has nothing left to enforce.

Reading orders with their lines is in scope precisely because every line passed
its foreign-key check when it was written.

What defeats this is a relation from an **unscoped** entity into a scoped one:
nothing checks the unscoped side on write, so a join through it reads rows the
caller's scope would have excluded. That is a schema design decision the
implementer owns — the framework's guarantee is that a resolver runs at every
repository *entry point*, and a join is not one.

See also the driver's note on
[relation cascades](../nestjs-repository-typeorm/README.md#relation-cascades-and-row-scope):
a cascaded write reaches a related table without entering its repository, so
`cascade` must not be enabled on a relation of a scoped entity.

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
    getAppContext(request).defineOverlay(
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
missing tenant then surfaces as a refusal from your resolver.

### What a resolver has to check

`target` is the existing row the call is aimed at (`update`, `replace`,
`delete`, `deleteMany`, `softDelete`, `restore`, and `upsert` when its key names
a stored row); it is `undefined` for `create` and `createMany`, which name no
existing row, and for an `upsert` whose key matches none. `value` is what will
be written.

Both name the same row. For `update`/`replace` the repository pins it before a
resolver runs: it refuses data that would change the primary key, and strips
relation objects from the merge base so a relation on the caller's entity cannot
decide which row is written.

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

If you write these yourself, read every primary key column through `transform`
rather than off the payload — `RowScopeBase` does, and it is how a key supplied
as `{ account: { id } }` is seen at all.

`createMany` and `deleteMany` invoke the callback once per element, and a
refusal rejects the whole call. Handle `deleteMany` explicitly: falling
through to a permissive default removes rows by primary key across scopes.

Refuse by throwing a `RuntimeException` (or subclass). Repositories sit below
the transport layer, so `httpStatus` is a hint a transport-aware layer may
read, not a commitment this layer makes. A bare `HttpException` is rewrapped
into a generic 500.

### Startup checks

Structural only — nothing probes what a resolver decides:

- every scoped entity has a resolver bound, and a declared-but-unbound
  repository refuses to serve at all (`RowScopeUnboundException`). This also
  catches a request-scoped resolver: its binding provider is never
  instantiated at bootstrap, so nothing gets bound;
- with `requireRowScopeDeclaration`, every entity carries a declaration.

A `RowScopeBase` subclass adds two of its own, at construction: the entity must
declare a primary key column (with none, the write pre-check would reduce to the
scope columns alone and match any row in scope), and a configured `column` must
actually exist on the entity. A subclass overriding `resolveScope` configures no
column, so only the first applies to it.

## Repository Registry

`RepositoryRegistryService` validates at application bootstrap that no
duplicate repository keys exist across `forFeature()` calls. If duplicates
are found, it throws `RepositoryDuplicateKeyException` with details about
which keys conflict.

```ts
// These two registrations would conflict at bootstrap:
RepositoryModule.forFeature({
  module: TypeOrmRepositoryModule,
  entities: [{ key: 'users', entity: UserEntity }],
});

RepositoryModule.forFeature({
  module: TypeOrmRepositoryModule,
  entities: [{ key: 'users', entity: AdminEntity }], // duplicate key!
});
// Throws: Duplicate repository keys: "users" (registered for UserEntity, attempted for AdminEntity)
```

## Federation

When a relation is marked `federated: true` (see
[Relation Metadata](#relation-metadata)), the `FederationOrchestrator`
intercepts `findAndCount` calls and executes **separate queries** for the
root entity and each relation instead of using SQL JOINs. Results are
hydrated together transparently.

This is useful when:

- JOINs produce expensive Cartesian products
- Relations live in different datasources
- Precise pagination control is needed (JOINs inflate row counts)

### How It Works

The caller uses the same `join`, `Where.rel()`, and `OrderBy.rel()` APIs
described in [Relations and Joins](#relations-and-joins). The orchestrator
analyzes the query and picks a strategy:

| Strategy | When | Flow |
| --- | --- | --- |
| **ROOT_FIRST** | No relation filters or sorts | Query root → fetch relations in parallel → hydrate |
| **RELATION_FIRST** | Has relation filters or sorts | Query relations → discover root IDs → fetch constrained roots → hydrate |

ROOT_FIRST is the common case: one root query plus one query per relation,
all relations fetched in parallel.

RELATION_FIRST handles queries that filter or sort by relation fields. It
iteratively queries the driving relation to discover matching root entity
IDs, then fetches only those roots.

### distinctFilter

For many-cardinality federated relations that use sorts or filters, provide
a `distinctFilter` to ensure one relation entity per root. Without it,
sorting is non-deterministic and a filtered total counts matching relation
rows rather than distinct roots (e.g. two matching posts for one user would
report a total of 2 instead of 1). Missing it throws `FederationException`:

```ts
relations: {
  posts: {
    federated: true,
    distinctFilter: Where.eq('isPrimary', true),
  },
},
```

### Constants

| Constant | Default | Description |
| --- | --- | --- |
| `FEDERATION_DEFAULT_LIMIT` | 10 | Default page size when none specified |
| `FEDERATION_MAX_ITERATIONS` | 10 | Max iterations for relation-first constraint discovery |
| `FEDERATION_MAX_BUFFER_SIZE` | 1000 | Max offset before aborting iterative discovery |

### Limitations

- OR conditions across federated relations are not supported (throws
  `FederationException`)
- Filtering or sorting by the owning side of a federated relation (the
  side holding the foreign key, e.g. the many side of a `@ManyToOne`) is
  not supported — only the non-owning side can drive relation-first
  discovery (throws `FederationException`)
- Only `findAndCount` is federated; `find`, `findOne`, and `count` use
  standard ORM queries

## Injecting Repositories

Use `@InjectDynamicRepository()` to inject
repositories registered via `forFeature()`:

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
| `RepositoryQueryException` | Wraps any opaque error thrown by a repository operation or its hook pipeline. `RuntimeException` subclasses (e.g. `OptimisticLockException`) pass through unwrapped |
| `OptimisticLockException` | An `update`, `replace`, `delete`, `softDelete` or `restore` targeted a stale version — the row was modified by another request since it was read |
| `RepositoryDuplicateKeyException` | Duplicate repository keys detected at bootstrap |
| `EntityAlreadyExistsException` | A `create`/`createMany` supplied a primary key that already names a row — create inserts, it never updates. Use `upsert` for insert-or-update |
| `PartialPrimaryKeyException` | A `create`/`createMany` supplied only part of a composite primary key. A partial key cannot be looked up, so nothing can tell whether it is taken. Supply every key column, or none for a generated key |
| `TransactionTimeoutException` | Transaction exceeded timeout duration |
| `TransactionClosedException` | A settled scope was used again — `getOrStart`, `enter`, `onCommit`, or `onRollback` after close |
| `TransactionHeuristicCommitException` | A multi-datasource commit failed after at least one datasource had already committed |
| `TransactionReadOnlyConflictException` | A joining `run()`/`runReadOnly()` call's `readOnly` option conflicts with the scope it's joining |
| `TransactionScopeFailedException` | A participant's own operation succeeded, but its shared scope had already failed via a sibling |
| `FederationException` | Unsupported federated query (e.g., OR across federated relations). A `RuntimeException` from a scoped peer repository passes through unwrapped, so a refusal keeps its own status hint |
| `RowScopeUnboundException` | A repository whose entity is declared scoped was asked to serve an operation before a resolver was bound to it — it refuses rather than running unscoped |
| `RowScopeBootException` | One or more structural row scope checks failed at startup; the message lists every failure |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-repository` | Module, adapter, repository interfaces, Where/OrderBy/Join builders, transaction management, hooks, federation, decorators, exceptions |
| `@concepta/nestjs-repository/testing` | `createMockTransaction`, `createMockRepository`, `MockTransactionHandle` |
