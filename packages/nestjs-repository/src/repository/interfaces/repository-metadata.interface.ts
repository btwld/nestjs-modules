import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type RepositoryColumnMetadataInterface } from './repository-column-metadata.interface.js';
import { type RepositoryRelationMetadataInterface } from './repository-relation-metadata.interface.js';

/**
 * Repository metadata interface for entity introspection.
 * Provides schema information without exposing the driver's internals.
 */
export interface RepositoryMetadataInterface<
  Entity extends PlainLiteralObject,
> {
  /** Entity name (class name) */
  name: string;
  /** Entity class/constructor */
  type: Type<Entity>;
  /**
   * Names the rows this entity reads. Two entities with the same URN read the
   * same rows, whatever their names. The driver derives it from the entity's
   * definition, as `urn:<driver>:…`; it is compared, never parsed.
   */
  urn: string;
  /** The entity's own columns. A relation is never one, even when it holds a key. */
  columns: RepositoryColumnMetadataInterface<Entity>[];
  /** Relation metadata for join resolution */
  relations?: RepositoryRelationMetadataInterface[];
}
