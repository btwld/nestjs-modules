import { type Type, type PlainLiteralObject } from '@nestjs/common';

import { type HookOption } from '@concepta/nestjs-core';

import { type WhereCondition } from '../repository/interfaces/where-clause.interface.js';
import { type RelationAction } from '../repository/repository.types.js';
import { type RowScopeRegistration } from '../row-scope/interfaces/row-scope-registration.interface.js';

/**
 * Per-relation configuration for forFeature() registration.
 *
 * Supports onDelete/onUpdate behavior and federation settings.
 */
export interface RelationActionConfig {
  onDelete?: Extract<RelationAction, 'delegate'>;
  onUpdate?: Extract<RelationAction, 'delegate'>;
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
 * Repository modules may extend this with driver-specific options.
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
   * Per-relation action config (onDelete / onUpdate).
   * Keyed by relation property name on the entity.
   */
  relations?: Record<string, RelationActionConfig>;

  /**
   * Row scope declaration for this entity.
   *
   * Either names the resolver that scopes its rows, or records that the
   * entity is deliberately public along with the reason.
   */
  rowScope?: RowScopeRegistration;

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

  /**
   * Additional driver-specific options.
   *
   * Note that this index signature means a misspelled option — `hook` for
   * `hooks` — type-checks and is then silently ignored. Nothing catches it:
   * the declaration never arrives, so the entity looks like one that wanted
   * no hooks.
   */
  [key: string]: unknown;
}
