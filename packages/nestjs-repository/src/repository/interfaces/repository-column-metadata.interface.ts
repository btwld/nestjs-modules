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
  /**
   * Whether this column is the soft-remove date column. Reporting one declares
   * that the driver supports soft delete for the entity: `softDelete` and
   * `restore` set and clear it, and a read without `withDeleted` leaves out
   * rows where it is set, on the entity and on every relation the read joins.
   */
  isRemoveDate: boolean;
  /** Whether this column is the optimistic-locking version column */
  isVersion: boolean;
}
