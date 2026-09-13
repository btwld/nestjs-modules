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
 * Options for create operations.
 */
export interface RepositoryCreateOptions extends RepositoryBaseOptions {}

/**
 * Options for update operations.
 */
export interface RepositoryUpdateOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends RepositoryBaseOptions {
  /**
   * Bypass the soft-deleted immutability guard, letting this write reach a
   * currently soft-deleted row. Not exposed over HTTP — for server-side
   * carve-outs only (e.g. pre-purge PII masking, admin data-integrity
   * corrections).
   */
  force?: boolean;

  /**
   * The version the caller believes this row is currently at. A mismatch
   * throws `OptimisticLockException`, preventing a lost update against a
   * row the caller last read before someone else changed it.
   */
  expectedVersion?: number;

  /**
   * Resolved by `RepositoryAdapter` — drivers consume this, callers never
   * set it. Any caller-supplied value is overwritten.
   */
  versionGuard?: RepositoryVersionGuardInterface<Entity>;
}

/**
 * Options for upsert operations.
 */
export interface RepositoryUpsertOptions extends RepositoryBaseOptions {
  /**
   * Bypass the soft-deleted immutability guard, letting this write reach a
   * currently soft-deleted row. Not exposed over HTTP — for server-side
   * carve-outs only (e.g. pre-purge PII masking, admin data-integrity
   * corrections).
   */
  force?: boolean;
}

/**
 * Options for delete operations (including `deleteMany`).
 */
export interface RepositoryDeleteOptions extends RepositoryBaseOptions {}

/**
 * Options for single-entity delete operations (`delete`, `softDelete`).
 * Not used by `deleteMany` — there is no single caller-held row for an
 * expected version to describe.
 */
export interface RepositoryDeleteOneOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends RepositoryDeleteOptions {
  /**
   * The version the caller believes this row is currently at. A mismatch
   * throws `OptimisticLockException`.
   */
  expectedVersion?: number;

  /**
   * Resolved by `RepositoryAdapter` — drivers consume this, callers never
   * set it. Any caller-supplied value is overwritten.
   */
  versionGuard?: RepositoryVersionGuardInterface<Entity>;
}

/**
 * Options for restore operations.
 */
export interface RepositoryRestoreOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends RepositoryBaseOptions {
  /**
   * The version the caller believes this row is currently at. A mismatch
   * throws `OptimisticLockException`.
   */
  expectedVersion?: number;

  /**
   * Resolved by `RepositoryAdapter` — drivers consume this, callers never
   * set it. Any caller-supplied value is overwritten.
   */
  versionGuard?: RepositoryVersionGuardInterface<Entity>;
}
