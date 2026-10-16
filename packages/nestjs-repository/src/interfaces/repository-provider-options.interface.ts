import { type Type, type PlainLiteralObject } from '@nestjs/common';

import { type HookOption } from '@concepta/nestjs-core';

import { type WhereCondition } from '../repository/interfaces/where-clause.interface.js';
import { type RowScopeRegistration } from '../row-scope/interfaces/row-scope-registration.interface.js';
import { type WritePolicyRegistration } from '../write-policy/interfaces/write-policy-registration.interface.js';

/**
 * Per-relation federation settings for forRoot() registration.
 */
export interface RelationConfig {
  /** Use separate queries instead of DB joins for this relation. */
  federated?: boolean;
  /**
   * Required for many-cardinality federated relations with sorts/filters.
   * Ensures exactly one relation entity per root for deterministic ordering.
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
   * Per-relation federation settings.
   * Keyed by relation property name on the entity.
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
   * and is absent entirely outside HTTP.
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
