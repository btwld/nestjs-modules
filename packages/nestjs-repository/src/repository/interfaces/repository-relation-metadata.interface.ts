import { type RepositoryColumnMetadataInterface } from './repository-column-metadata.interface.js';

/**
 * A relation the driver reports for an entity.
 *
 * `on.from` is always "my column", `on.to` is always "their column".
 */
export interface RepositoryRelationMetadataInterface {
  /** Relation property name on the entity (e.g., 'blog', 'posts') */
  name: string;
  /** Target entity name (e.g., 'BlogEntity') */
  targetEntity: string;
  /** URN of the rows the target reads, as the target reports its own `urn`. */
  targetUrn: string;
  /**
   * The target entity's own columns, derived by the driver from the target's
   * entity definition the same way it derives `columns` for the root.
   */
  targetColumns: RepositoryColumnMetadataInterface[];
  /** 'one' for 1:1/N:1, 'many' for 1:N/M:N */
  cardinality: 'one' | 'many';
  /** Column mapping: from = source entity column, to = target entity column */
  on: { from: string; to: string };
  /** Foreign key columns this entity holds; owning side of a to-one relation only. */
  foreignKey?: { from: string; to: string }[];
  /** M:N junction info */
  through?: {
    /** URN of the junction's rows, in the same form as an entity's `urn`. */
    urn: string;
    /** Junction FK column pointing to the source entity. */
    fromKey: string;
    /** Junction FK column pointing to the target entity. */
    toKey: string;
  };
}
