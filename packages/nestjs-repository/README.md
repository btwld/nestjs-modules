# @concepta/nestjs-repository

Repository abstraction module for NestJS. Provides a driver-agnostic
`RepositoryAdapter` base class, transaction management with automatic
nesting, and a two-level repository hook system.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-repository)](https://www.npmjs.com/package/@concepta/nestjs-repository)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-repository)](https://www.npmjs.com/package/@concepta/nestjs-repository)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/conceptadev/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-repository%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

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

### Settings

```ts
interface RepositoryModuleOptionsInterface {
  defaultTimeout?: number; // Transaction timeout in milliseconds (default: 30000)
}
```

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

### Concrete Members

The public `find`, `findOne`, `count`, `findAndCount`, `create`,
`createMany`, `update`, `upsert`, `replace`, `delete`, `deleteMany`,
`softDelete`, and `restore` methods are concrete — each runs the
[hook pipeline](#hook-pipeline) around the matching `do*` method.

| Member | Visibility | Description |
| --- | --- | --- |
| `prepare(dto)` | public | Returns `dto` unchanged if it is already an entity instance, otherwise `Object.assign(new entityType(), dto)` |
| `getPrimaryColumns()` | protected | Get primary key column names from metadata (subclass-author API) |
| `getVersionColumn()` | protected | Get the optimistic-locking version column name from metadata, if any (subclass-author API) |
| `toDnf(clause)` | protected | Convert `WhereClause` AST to Disjunctive Normal Form (subclass-author API) |
| `runHooks(methodKey, payload, ctx)` | protected | Execute repository hooks for a lifecycle event (subclass-author API) |
| `resolveJoinClauses(join?)` | protected | Resolve structural join properties from relation metadata (subclass-author API) |

### Implementing a Repository

```ts
import { RepositoryAdapter } from '@concepta/nestjs-repository';

class MyDriverRepository<Entity> extends RepositoryAdapter<Entity> {
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

Each entry in `metadata.columns` must supply `name`, `isPrimary`,
`isRemoveDate`, and `isVersion`. Set `isVersion: true` on the
optimistic-locking version column, if the driver has one — `getVersionColumn()`
reads it. Adapters that leave it `false` everywhere simply get no
optimistic-locking support.

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

Structural properties (`on`, `through`, `cardinality`) are resolved
automatically from entity relation metadata by the adapter (via the
protected `resolveJoinClauses()`).

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
| `inner(relation)` | INNER JOIN (excludes rows with no match) |
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
| `and(...conditions)` | All conditions must match |
| `or(...conditions)` | Any condition must match |

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
}
```

Factories are registered automatically when using `RepositoryModule.forFeature()`
with a driver module that returns `transactionFactories` in its
`DynamicRepositoryModule`.

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
to specific entities using specifications.

### Defining a Hook

```ts
import {
  RepoHook,
  BeforeFind,
  AfterCreate,
} from '@concepta/nestjs-repository';

@RepoHook()
export class AuditHook {
  @BeforeFind()
  addTenantFilter(options, ctx) {
    // Modify query options before find
    return { ...options, where: { ...options.where, tenantId: ctx.tenantId } };
  }

  @AfterCreate()
  logCreation(entity, ctx) {
    // React to entity creation
    return entity;
  }
}
```

### Scoped Hooks

Use specifications to restrict a hook to specific entities:

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
| `@BeforeRead` / `@AfterRead` | find, findOne, count, findAndCount |
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
  original, which wins on conflict — the original/DB result survives hook
  mutations.
- **`Membrane.collection`** -- `createMany` (`overwrite`: hooks may freely
  transform the array) and `deleteMany` (`preserve`: the original array
  wins on conflict) keep the strategy argument, since it governs array
  merging rather than object replacement.

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
| `OptimisticLockException` | An `update`/`replace` targeted a stale version — the row was modified by another request since it was read |
| `RepositoryDuplicateKeyException` | Duplicate repository keys detected at bootstrap |
| `TransactionTimeoutException` | Transaction exceeded timeout duration |
| `TransactionClosedException` | A settled scope was used again — `getOrStart`, `enter`, `onCommit`, or `onRollback` after close |
| `TransactionHeuristicCommitException` | A multi-datasource commit failed after at least one datasource had already committed |
| `TransactionReadOnlyConflictException` | A joining `run()`/`runReadOnly()` call's `readOnly` option conflicts with the scope it's joining |
| `TransactionScopeFailedException` | A participant's own operation succeeded, but its shared scope had already failed via a sibling |
| `FederationException` | Unsupported federated query (e.g., OR across federated relations) |

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-repository` | Module, adapter, repository interfaces, Where/OrderBy/Join builders, transaction management, hooks, federation, decorators, exceptions |
| `@concepta/nestjs-repository/testing` | `createMockTransaction`, `createMockRepository`, `MockTransactionHandle` |
