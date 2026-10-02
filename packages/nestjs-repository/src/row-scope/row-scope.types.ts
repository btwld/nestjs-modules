import { type PlainLiteralObject } from '@nestjs/common';

import { type EntityColumn } from '../repository/repository.types.js';

/**
 * A scope value, or a primary key value, as `RowScopeBase` accepts them.
 */
export type ScalarValue = string | number;

/**
 * `NaN` is excluded deliberately: it is never equal to itself, so a scope value
 * of `NaN` would make every comparison in `RowScopeBase` refuse for reasons no
 * reader could diagnose.
 */
export const isScalarValue = (value: unknown): value is ScalarValue =>
  typeof value === 'string' ||
  (typeof value === 'number' && !Number.isNaN(value));

/**
 * The columns a principal is confined to, and its value for each.
 *
 * Returned by `RowScopeBase.resolveScope`. The class derives the read
 * predicate, the write pre-check and the stamp from it — one value per column,
 * used for all three, so they cannot drift apart.
 */
export type RowScopeValues<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> = Readonly<Partial<Record<EntityColumn<Entity>, ScalarValue>>>;

/**
 * Canonical operation constants for row scope callbacks.
 *
 * String values match the public repository method names, so a resolver can
 * switch on `params.operation` against named members and a boot check can
 * compare the set against the adapter's own prototype.
 */
export const RowScopeOperation = {
  // Query operations
  FIND: 'find',
  FIND_ONE: 'findOne',
  COUNT: 'count',
  FIND_AND_COUNT: 'findAndCount',
  // Create operations
  CREATE: 'create',
  CREATE_MANY: 'createMany',
  // Update operations
  UPDATE: 'update',
  REPLACE: 'replace',
  UPSERT: 'upsert',
  // Delete / lifecycle operations
  DELETE: 'delete',
  DELETE_MANY: 'deleteMany',
  SOFT_DELETE: 'softDelete',
  RESTORE: 'restore',
} as const;

export type RowScopeOperation =
  (typeof RowScopeOperation)[keyof typeof RowScopeOperation];

/**
 * Operations that scope a query rather than a value.
 */
export type RowScopeQueryOperation =
  | typeof RowScopeOperation.FIND
  | typeof RowScopeOperation.FIND_ONE
  | typeof RowScopeOperation.COUNT
  | typeof RowScopeOperation.FIND_AND_COUNT;

/**
 * Operations that scope a value being written.
 *
 * Derived by exclusion so a new member added to `RowScopeOperation` lands on
 * the write side by default — the direction that fails closed.
 */
export type RowScopeWriteOperation = Exclude<
  RowScopeOperation,
  RowScopeQueryOperation
>;
