import { type Type, type PlainLiteralObject } from '@nestjs/common';

import { type WhereCondition } from '../repository/interfaces/where-clause.interface.js';
import { type RelationAction } from '../repository/repository.types.js';

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
   * Additional driver-specific options.
   */
  [key: string]: unknown;
}
