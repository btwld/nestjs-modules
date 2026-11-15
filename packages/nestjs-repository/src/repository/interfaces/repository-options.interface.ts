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
  /**
   * The own columns each row holds. Absent or empty, it holds every own
   * column. A joined relation is attached whether or not its key columns
   * are selected, except a federated one, whose key must be selected.
   */
  select?: (keyof Entity)[];
  /**
   * The most a row holds when the read selects nothing: these own columns,
   * less any the caller may not read, which are left out rather than
   * refused; the read is refused when none is left. For a default you
   * choose, such as the columns a route shows, where `select` is for columns
   * the caller asked for: naming one they may not read in `select` refuses
   * the read. Ignored when `select` is given, except that a name that is no
   * column refuses the read, for every caller.
   */
  within?: (keyof Entity)[];
  where?: WhereClause;
  join?: JoinClause[];
  order?: OrderClause;
  /**
   * Include soft-deleted rows, on the entity and on every relation the read
   * joins. Changes nothing on an entity without a soft-remove date column.
   */
  withDeleted?: boolean;
}

/**
 * Options for finding multiple entities.
 *
 * `skip` and `take` page the entity's rows, never joined ones: under a
 * to-many join, each row on the page holds every related row its `where`
 * keeps.
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
 * Options every write takes.
 */
export interface RepositoryWriteOptions extends RepositoryBaseOptions {
  /**
   * The domain operation the write carries out, such as `void` or
   * `approve`. On an entity an authority governs, the write is decided as
   * this action too, beside its own (`update` and so on), and both must
   * allow it, every column it writes included: naming one can only narrow
   * what the write may do. Related rows a cascade writes are decided by
   * their own actions only.
   */
  action?: string;
}

/**
 * Options for create operations.
 */
export interface RepositoryCreateOptions extends RepositoryWriteOptions {}

/**
 * Options for update operations.
 */
export interface RepositoryUpdateOptions extends RepositoryWriteOptions {
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
export interface RepositoryUpsertOptions extends RepositoryWriteOptions {}

/**
 * Options for delete operations (including `deleteMany`).
 */
export interface RepositoryDeleteOptions extends RepositoryWriteOptions {}

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
export interface RepositoryRestoreOptions extends RepositoryWriteOptions {
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
