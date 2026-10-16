import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type RepositoryMetadataInterface } from './repository-metadata.interface.js';
import {
  type RepositoryCreateOptions,
  type RepositoryDeleteOneOptions,
  type RepositoryDeleteOptions,
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
  type RepositoryRestoreOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
} from './repository-options.interface.js';

export interface RepositoryInterface<Entity extends PlainLiteralObject> {
  /**
   * Repository metadata for entity introspection.
   * Provides schema information without exposing the driver's internals.
   */
  readonly metadata: RepositoryMetadataInterface<Entity>;

  // Query operations

  /**
   * Find multiple entities matching the given options.
   *
   * @param options - Find options (where, order, skip, take, etc.)
   * @returns Array of matching entities
   */
  find(options?: RepositoryFindOptions<Entity>): Promise<Entity[]>;

  /**
   * Find a single entity matching the given options.
   *
   * @param options - Find options (where, order, etc.)
   * @returns The matching entity or null if not found
   */
  findOne(options: RepositoryFindOneOptions<Entity>): Promise<Entity | null>;

  /**
   * Count the entities the given options match.
   *
   * Only `where`, `join` and `withDeleted` decide the count. `select`,
   * `order`, `skip` and `take` change how rows are shaped or paged, not how
   * many match, so the same options a `find` takes return that read's total.
   *
   * @param options - Find options; which rows to count
   * @returns Number of matching entities
   */
  count(options?: RepositoryFindOptions<Entity>): Promise<number>;

  /**
   * Find multiple entities and count total matching records.
   *
   * @param options - Find options (where, order, skip, take, etc.)
   * @returns Tuple of [entities, totalCount]
   */
  findAndCount(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<[Entity[], number]>;

  // Create operations

  /**
   * Create a single entity.
   *
   * **An insert, never an update.** A primary key that already names a row
   * throws `EntityAlreadyExistsException` rather than overwriting it — use
   * `upsert` for insert-or-update. Enforced by `RepositoryAdapter` before the
   * driver is called, because a save-by-primary-key implementation would
   * otherwise let a caller supplying someone else's key overwrite that row,
   * and no permission check above this layer could see it happen.
   *
   * Caller-supplied primary keys are otherwise fine; the key space is the
   * database's to enforce.
   *
   * @param entity - Partial entity data to create
   * @param options - Create options
   * @returns The created entity, including database defaults and generated
   * columns
   */
  create(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity>;

  /**
   * Create multiple entities.
   *
   * Inserts, never updates — see {@link RepositoryInterface.create}. A
   * duplicate primary key anywhere in the batch fails the whole call.
   *
   * @param entities - Array of partial entity data to create
   * @param options - Create options
   * @returns Array of created entities, in the order given
   */
  createMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]>;

  // Update operations

  /**
   * Update an existing entity by merging partial data.
   * Preserves fields not specified in the data.
   *
   * @param entity - Existing entity to update (primary keys used for identification)
   * @param data - Partial data to merge into entity
   * @param options - Update options
   * @returns The updated entity
   */
  update(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity>;

  /**
   * Create or update an entity based on primary key.
   * If entity with matching primary key exists, updates it; otherwise creates new.
   *
   * @param entity - Entity data with primary key
   * @param options - Upsert options
   * @returns The created or updated entity
   */
  upsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity>;

  /**
   * Replace an entity's fields with new data.
   *
   * Writes exactly the fields in `data`; a field it leaves out keeps its
   * stored value. That `data` supplies every field is the caller's to
   * validate, e.g. with a schema that requires the whole body.
   *
   * @param entity - Existing entity to replace (primary keys used for identification)
   * @param data - New data to replace entity with
   * @param options - Update options
   * @returns The replaced entity
   */
  replace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity>;

  // Delete operations

  /**
   * Permanently delete an entity (hard delete).
   *
   * @param entity - Entity to delete (primary keys used for identification)
   * @param options - Delete options
   * @returns The deleted entity
   */
  delete(entity: Entity, options?: RepositoryDeleteOneOptions): Promise<Entity>;

  /**
   * Permanently delete multiple entities (hard delete).
   *
   * @param entities - Array of entities to delete
   * @param options - Delete options
   * @returns Array of deleted entities
   */
  deleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]>;

  /**
   * Soft delete an entity by setting its delete date.
   *
   * @param entity - Entity to soft delete (primary keys used for identification)
   * @param options - Delete options
   * @returns The soft-deleted entity
   */
  softDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions,
  ): Promise<Entity>;

  /**
   * Restore a soft-deleted entity.
   *
   * @param entity - Soft-deleted entity to restore (primary keys used for identification)
   * @param options - Restore options
   * @returns The restored entity
   */
  restore(entity: Entity, options?: RepositoryRestoreOptions): Promise<Entity>;
}
