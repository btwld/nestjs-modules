import { type PlainLiteralObject } from '@nestjs/common';

import { type OrderClause } from '../repository.types.js';

import { type JoinClause } from './join-clause.interface.js';
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
export interface RepositoryUpdateOptions extends RepositoryBaseOptions {
  /**
   * Bypass the soft-deleted immutability guard, letting this write reach a
   * currently soft-deleted row. Not exposed over HTTP — for server-side
   * carve-outs only (e.g. pre-purge PII masking, admin data-integrity
   * corrections).
   */
  force?: boolean;
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
 * Options for delete operations.
 */
export interface RepositoryDeleteOptions extends RepositoryBaseOptions {}

/**
 * Options for restore operations.
 */
export interface RepositoryRestoreOptions extends RepositoryBaseOptions {}
