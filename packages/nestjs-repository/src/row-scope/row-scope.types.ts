/**
 * A scope value, or a primary key value, as `RowScopeBase` accepts them.
 */
export type ScalarValue = string | number;

/**
 * `NaN` is excluded: it is never equal to itself, so it could match no row.
 */
export const isScalarValue = (value: unknown): value is ScalarValue =>
  typeof value === 'string' ||
  (typeof value === 'number' && !Number.isNaN(value));

/**
 * The columns a principal is confined to, and its value for each.
 */
export type RowScopeValues = Readonly<Record<string, ScalarValue>>;

/**
 * Canonical operation constants for row scope callbacks.
 *
 * String values match the public repository method names.
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
 */
export type RowScopeWriteOperation = Exclude<
  RowScopeOperation,
  RowScopeQueryOperation
>;
