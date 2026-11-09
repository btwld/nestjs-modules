import { type Type, type PlainLiteralObject } from '@nestjs/common';

import { type HookOption } from '@concepta/nestjs-core';

import { type ActivityRegistration } from '../activity/interfaces/activity-registration.interface.js';
import { type WhereCondition } from '../repository/interfaces/where-clause.interface.js';
import { type RowScopeRegistration } from '../row-scope/interfaces/row-scope-registration.interface.js';
import { type WritePolicyRegistration } from '../write-policy/interfaces/write-policy-registration.interface.js';

/**
 * Per-relation settings for forRoot() registration.
 */
export interface RelationConfig {
  /**
   * Write this relation's rows through the related entity's own repository
   * when this entity is written: created, updated, deleted, soft deleted and
   * restored with it. Only for a relation whose rows hold the foreign key to
   * this entity's primary key.
   */
  cascade?: boolean;
  /**
   * Read this relation through the related entity's own repository instead
   * of a join, so it can live in another database.
   */
  federated?: boolean;
  /**
   * A condition on the related entity's own columns that its rows must meet
   * to belong to this federated relation, on every join and filter.
   */
  distinctFilter?: WhereCondition<PlainLiteralObject>;
}

/**
 * Options for registering a repository provider.
 * Drivers extend this with their own options; `RepositoryModule.forRoot()`
 * checks each entity against its driver's.
 */
export interface RepositoryProviderOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  /**
   * String key used as injection token.
   * Used with `@InjectDynamicRepository('key')`.
   */
  key: string;

  /**
   * Entity class.
   */
  entity: Type<Entity>;

  /**
   * Per-relation settings, keyed by relation property name on the entity.
   */
  relations?: Record<string, RelationConfig>;

  /**
   * Row scope declaration for this entity.
   *
   * Either names the resolver that scopes its rows, or records that the
   * entity is deliberately public along with the reason.
   */
  rowScope?: RowScopeRegistration;

  /**
   * Whether stored rows of this entity may change.
   *
   * `{ access: 'append-only', reason }` refuses every operation that targets
   * a stored row — update, replace, upsert, delete, deleteMany, soft-delete,
   * restore —
   * while leaving `create` open. Correct such a record by appending a new one
   * that references it.
   */
  writePolicy?: WritePolicyRegistration;

  /**
   * Record every write to this entity in an activity store: one record per
   * stored row altered, written through the store's own repository with the
   * caller's `ctx`, so it joins whatever transaction the caller opened.
   */
  activity?: ActivityRegistration;

  /**
   * Accept results holding declared relations nobody joined.
   *
   * By default a result holds this entity's own columns and the relations its
   * read joins, and anything else throws. Set this when the entity loads
   * relations on its own — eagerly — and callers expect them on every row.
   * Any other unexpected property still throws.
   */
  allowEagerRelations?: boolean;

  /**
   * Repository hooks that apply to this entity, whatever reaches it.
   *
   * Registering here is what makes a hook run on a call this entity's own
   * controller did not start — another entity's hook forwarding its `ctx`, a
   * queue consumer, a seeder, a test. `@UseHooks()` puts its list on the
   * request's `ctx` instead, which is read by whichever entity that `ctx`
   * reaches: so a route hook follows a forwarded `ctx` into other entities,
   * and is absent entirely outside HTTP routes and RPC message handlers.
   *
   * Both paths apply per call. A class carried on the `ctx` that is also
   * registered here runs once; registering the same class twice here is
   * refused at startup.
   *
   * Hook classes must be resolvable from the application container (listed in
   * some module's `providers`) and carry a class-level `@RepoHook()`. Both are
   * checked at startup.
   */
  hooks?: HookOption[];
}
