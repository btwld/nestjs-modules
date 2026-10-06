import { type PlainLiteralObject } from '@nestjs/common';

/**
 * Column metadata for repository introspection.
 */
export interface RepositoryColumnMetadataInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  /** Property name on the entity class */
  name: keyof Entity & string;
  /** Whether this is a primary key column */
  isPrimary: boolean;
  /** Whether this column is the soft-remove date column */
  isRemoveDate: boolean;
  /** Whether this column is the optimistic-locking version column */
  isVersion: boolean;
}
