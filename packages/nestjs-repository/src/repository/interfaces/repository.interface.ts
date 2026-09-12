import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type RepositoryMetadataInterface } from './repository-metadata.interface.js';
import {
  type RepositoryCreateOptions,
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
   * Provides schema information without exposing ORM internals.
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
   * Count entities matching the given options.
   *
   * @param options - Find options (where conditions)
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
   * @param entity - Partial entity data to create
   * @param options - Create options
   * @returns The created entity
   */
  create(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity>;

  /**
   * Create multiple entities.
   *
   * @param entities - Array of partial entity data to create
   * @param options - Create options
   * @returns Array of created entities
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
   * Overwrites all fields (clears fields not specified in data).
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
  delete(entity: Entity, options?: RepositoryDeleteOptions): Promise<Entity>;

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
    options?: RepositoryDeleteOptions,
  ): Promise<Entity>;

  /**
   * Restore a soft-deleted entity.
   *
   * @param entity - Soft-deleted entity to restore (primary keys used for identification)
   * @param options - Restore options
   * @returns The restored entity
   */
  restore(entity: Entity, options?: RepositoryRestoreOptions): Promise<Entity>;

  // Utility methods

  /**
   * Transform a partial entity-like object into an entity instance.
   *
   * @param entityLike - Partial entity data
   * @returns Entity instance
   */
  transform(entityLike: DeepPartial<Entity>): Entity;

  /**
   * Merge multiple partial entities into an existing entity.
   *
   * @param mergeIntoEntity - Target entity to merge into
   * @param entityLikes - Partial entities to merge
   * @returns The merged entity
   */
  merge(mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity;

  /**
   * Prepare a DTO for write operations.
   * Transforms DTO to entity instance if needed.
   *
   * @param dto - DTO or partial entity to prepare
   * @returns Prepared entity instance, or undefined if invalid
   */
  prepare(dto: DeepPartial<Entity>): Entity | undefined;
}
