import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type RepositoryColumnMetadataInterface } from './repository-column-metadata.interface.js';
import { type RepositoryRelationMetadataInterface } from './repository-relation-metadata.interface.js';

/**
 * Repository metadata interface for entity introspection.
 * Provides schema information without exposing ORM internals.
 */
export interface RepositoryMetadataInterface<
  Entity extends PlainLiteralObject,
> {
  /** Entity name (class name) */
  name: string;
  /** Entity class/constructor */
  type: Type<Entity>;
  /** All columns in the entity */
  columns: RepositoryColumnMetadataInterface<Entity>[];
  /** Relation metadata for join resolution */
  relations?: RepositoryRelationMetadataInterface[];
}
