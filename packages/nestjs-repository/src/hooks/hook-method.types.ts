import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import {
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
} from '../repository/interfaces/repository-options.interface.js';

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Before find - receives FindManyOptions, returns modified options.
 */
export type BeforeFindMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  options: RepositoryFindOptions<Entity>,
  ctx?: Ctx,
) => Promise<RepositoryFindOptions<Entity>>;

/**
 * After find - receives array of entities, returns modified array.
 */
export type AfterFindMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity[], ctx?: Ctx) => Promise<Entity[]>;

/**
 * Before findOne - receives FindOneOptions, returns modified options.
 */
export type BeforeFindOneMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  options: RepositoryFindOneOptions<Entity>,
  ctx?: Ctx,
) => Promise<RepositoryFindOneOptions<Entity>>;

/**
 * After findOne - receives entity or null, returns entity or null.
 */
export type AfterFindOneMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity | null, ctx?: Ctx) => Promise<Entity | null>;

/**
 * Before count - receives FindManyOptions, returns modified options.
 */
export type BeforeCountMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  options: RepositoryFindOptions<Entity>,
  ctx?: Ctx,
) => Promise<RepositoryFindOptions<Entity>>;

/**
 * After count - receives count, returns count.
 */
export type AfterCountMethod<
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: number, ctx?: Ctx) => Promise<number>;

/**
 * Before findAndCount - receives FindManyOptions, returns modified options.
 */
export type BeforeFindAndCountMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  options: RepositoryFindOptions<Entity>,
  ctx?: Ctx,
) => Promise<RepositoryFindOptions<Entity>>;

/**
 * After findAndCount - receives [entities, count], returns [entities, count].
 */
export type AfterFindAndCountMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: [Entity[], number], ctx?: Ctx) => Promise<[Entity[], number]>;

// =============================================================================
// Create Operations
// =============================================================================

/**
 * Before create - receives entity data, returns modified data.
 */
export type BeforeCreateMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (data: DeepPartial<Entity>, ctx?: Ctx) => Promise<DeepPartial<Entity>>;

/**
 * After create - receives created entity, returns entity.
 */
export type AfterCreateMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * Before createMany - receives array of entity data, returns modified array.
 */
export type BeforeCreateManyMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (data: DeepPartial<Entity>[], ctx?: Ctx) => Promise<DeepPartial<Entity>[]>;

/**
 * After createMany - receives created entities, returns entities.
 */
export type AfterCreateManyMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity[], ctx?: Ctx) => Promise<Entity[]>;

// =============================================================================
// Update Operations
// =============================================================================

/**
 * Before update - receives entity and update data, returns modified data.
 */
export type BeforeUpdateMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  entity: Entity,
  data: DeepPartial<Entity>,
  ctx?: Ctx,
) => Promise<DeepPartial<Entity>>;

/**
 * After update - receives updated entity, returns entity.
 */
export type AfterUpdateMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * Before upsert - receives entity data, returns modified data.
 */
export type BeforeUpsertMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (data: DeepPartial<Entity>, ctx?: Ctx) => Promise<DeepPartial<Entity>>;

/**
 * After upsert - receives upserted entity, returns entity.
 */
export type AfterUpsertMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * Before replace - receives entity and replacement data, returns modified data.
 */
export type BeforeReplaceMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  entity: Entity,
  data: DeepPartial<Entity>,
  ctx?: Ctx,
) => Promise<DeepPartial<Entity>>;

/**
 * After replace - receives replaced entity, returns entity.
 */
export type AfterReplaceMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

// =============================================================================
// Delete Operations
// =============================================================================

/**
 * Before delete - receives entity, returns entity (or throws to prevent).
 */
export type BeforeDeleteMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (entity: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * After delete - receives deleted entity, returns entity.
 */
export type AfterDeleteMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * Before deleteMany - receives entities, returns entities (or throws to prevent).
 */
export type BeforeDeleteManyMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (entities: Entity[], ctx?: Ctx) => Promise<Entity[]>;

/**
 * After deleteMany - receives deleted entities, returns entities.
 */
export type AfterDeleteManyMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity[], ctx?: Ctx) => Promise<Entity[]>;

// =============================================================================
// Lifecycle Operations (soft delete/restore)
// =============================================================================

/**
 * Before soft delete - receives entity, returns entity.
 */
export type BeforeSoftDeleteMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (entity: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * After soft delete - receives soft-deleted entity, returns entity.
 */
export type AfterSoftDeleteMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * Before restore - receives entity, returns entity.
 */
export type BeforeRestoreMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (entity: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * After restore - receives restored entity, returns entity.
 */
export type AfterRestoreMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

// =============================================================================
// High-Level Semantic Operations (catch-all)
// =============================================================================

/**
 * Before any read operation (find, findOne, count, findAndCount).
 * Uses FindManyOptions as it's the superset.
 */
export type BeforeReadMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  options: RepositoryFindOptions<Entity>,
  ctx?: Ctx,
) => Promise<RepositoryFindOptions<Entity>>;

/**
 * After any read operation.
 */
export type AfterReadMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  result: Entity | Entity[] | null | number | [Entity[], number],
  ctx?: Ctx,
) => Promise<Entity | Entity[] | null | number | [Entity[], number]>;

/**
 * Before any write operation (create, createMany, update, upsert, replace).
 */
export type BeforeWriteMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (
  data: DeepPartial<Entity> | DeepPartial<Entity>[],
  ctx?: Ctx,
) => Promise<DeepPartial<Entity> | DeepPartial<Entity>[]>;

/**
 * After any write operation.
 */
export type AfterWriteMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity | Entity[], ctx?: Ctx) => Promise<Entity | Entity[]>;

/**
 * Before any transition operation (softRemove, restore).
 */
export type BeforeTransitionMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (entity: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * After any transition operation.
 */
export type AfterTransitionMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * Before any destroy operation (remove - hard delete).
 */
export type BeforeDestroyMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (entity: Entity, ctx?: Ctx) => Promise<Entity>;

/**
 * After any destroy operation.
 */
export type AfterDestroyMethod<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> = (result: Entity, ctx?: Ctx) => Promise<Entity>;
