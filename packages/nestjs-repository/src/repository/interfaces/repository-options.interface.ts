import { type PlainLiteralObject } from '@nestjs/common';

import { type OrderClause } from '../repository.types.js';

import { type JoinClause } from './join-clause.interface.js';
import { type RepositoryVersionGuardInterface } from './repository-version-guard.interface.js';
import { type WhereClause } from './where-clause.interface.js';

/**
 * Base options with optional context.
 */
export interface RepositoryBaseOptions {
  ctx?: PlainLiteralObject;
}

/**
 * Options for finding a single entity.
 */
export interface RepositoryFindOneOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends RepositoryBaseOptions {
  select?: (keyof Entity)[];
  where?: WhereClause;
  join?: JoinClause[];
  order?: OrderClause;
  withDeleted?: boolean;
}

/**
 * Options for finding multiple entities.
 */
export interface RepositoryFindOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends RepositoryFindOneOptions<Entity> {
  skip?: number;
  take?: number;
}

/**
 * What a driver counts by: which rows match. `RepositoryAdapter.count` takes
 * find options and hands its driver only these, since how rows are selected,
 * sorted or paged does not change how many match.
 */
export interface RepositoryCountOptions extends RepositoryBaseOptions {
  where?: WhereClause;
  join?: JoinClause[];
  withDeleted?: boolean;
}

/**
 * Options for create operations.
 */
export interface RepositoryCreateOptions extends RepositoryBaseOptions {}

/**
 * Options for update operations.
 */
export interface RepositoryUpdateOptions extends RepositoryBaseOptions {
  /**
   * The version the caller believes this row is currently at. A mismatch
   * throws `OptimisticLockException`, preventing a lost update against a
   * row the caller last read before someone else changed it.
   */
  expectedVersion?: number;
}

/**
 * Options for upsert operations.
 */
export interface RepositoryUpsertOptions extends RepositoryBaseOptions {}

/**
 * Options for delete operations (including `deleteMany`).
 */
export interface RepositoryDeleteOptions extends RepositoryBaseOptions {}

/**
 * Options for single-entity delete operations (`delete`, `softDelete`).
 * Not used by `deleteMany` — there is no single caller-held row for an
 * expected version to describe.
 */
export interface RepositoryDeleteOneOptions extends RepositoryDeleteOptions {
  /**
   * The version the caller believes this row is currently at. A mismatch
   * throws `OptimisticLockException`.
   */
  expectedVersion?: number;
}

/**
 * Options for restore operations.
 */
export interface RepositoryRestoreOptions extends RepositoryBaseOptions {
  /**
   * The version the caller believes this row is currently at. A mismatch
   * throws `OptimisticLockException`.
   */
  expectedVersion?: number;
}

/**
 * Added by `RepositoryAdapter` to the options it hands a driver for a write
 * against a stored row. Never part of a caller's options.
 */
export interface RepositoryVersionGuardOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  /** The compare-and-swap the driver must execute; absent when none applies. */
  versionGuard?: RepositoryVersionGuardInterface<Entity>;
}
