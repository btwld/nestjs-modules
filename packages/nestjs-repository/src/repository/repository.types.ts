import { type PlainLiteralObject } from '@nestjs/common';

import {
  type OrderSortKeyAsc,
  type OrderSortKeyDesc,
} from './interfaces/order-sort-key.interface.js';

/**
 * Column name type — narrows to `keyof T & string` when an entity is provided.
 */
export type EntityColumn<T extends PlainLiteralObject = PlainLiteralObject> =
  keyof T & string;

/**
 * Canonical operator constants for the where clause AST.
 * String values match the wire format without the $ prefix.
 */
export const WhereOperator = {
  // Point filters (discrete values, high sargability)
  EQ: 'eq',
  NE: 'ne',
  IN: 'in',
  NIN: 'nin',
  // Pattern filters (string matching)
  CONTAINS: 'contains',
  NCONTAINS: 'ncontains',
  STARTS: 'starts',
  NSTARTS: 'nstarts',
  ENDS: 'ends',
  NENDS: 'nends',
  // Null state
  IS_NULL: 'null',
  NOT_NULL: 'nnull',
  // Range filters
  GT: 'gt',
  LT: 'lt',
  GTE: 'gte',
  LTE: 'lte',
  BETWEEN: 'between',
} as const;

export type WhereOperator = (typeof WhereOperator)[keyof typeof WhereOperator];

/**
 * Operator group types — partition WhereOperator by value shape.
 */
export type WhereNullaryOperator =
  typeof WhereOperator.IS_NULL | typeof WhereOperator.NOT_NULL;

export type WhereScalarOperator =
  | typeof WhereOperator.EQ
  | typeof WhereOperator.NE
  | typeof WhereOperator.GT
  | typeof WhereOperator.GTE
  | typeof WhereOperator.LT
  | typeof WhereOperator.LTE
  | typeof WhereOperator.CONTAINS
  | typeof WhereOperator.NCONTAINS
  | typeof WhereOperator.STARTS
  | typeof WhereOperator.NSTARTS
  | typeof WhereOperator.ENDS
  | typeof WhereOperator.NENDS;

export type WhereArrayOperator =
  typeof WhereOperator.IN | typeof WhereOperator.NIN;

export type WherePairOperator = typeof WhereOperator.BETWEEN;

/**
 * Canonical compound operator constants.
 */
export const WhereCompoundOperator = {
  AND: 'and',
  OR: 'or',
} as const;

export type WhereCompoundOperator =
  (typeof WhereCompoundOperator)[keyof typeof WhereCompoundOperator];

/**
 * Tuple shorthand for a where condition: `[field, operator, value?]`.
 */
export type WhereConditionArr<
  T extends PlainLiteralObject = PlainLiteralObject,
> = [EntityColumn<T>, WhereOperator, unknown?];

/**
 * Relation action types for onDelete / onUpdate behavior.
 *
 * - `delegate` — defer to native schema settings (default)
 * - `cascade` — adapter handles it (guarantees hooks/events run)
 * - `restrict` — throw error if related records exist
 * - `setNull` — set FK to null, leaving orphans
 */
export type RelationAction = 'delegate' | 'cascade' | 'restrict' | 'setNull';

/**
 * Sort order constants.
 */
export const SortOrder = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

/**
 * A sort key on a single entity field — discriminated union on `order`.
 */
export type OrderSortKey<T extends PlainLiteralObject = PlainLiteralObject> =
  OrderSortKeyAsc<T> | OrderSortKeyDesc<T>;

/**
 * Tuple shorthand for an order sort key: `[field, order]`.
 */
export type OrderSortKeyArr<T extends PlainLiteralObject = PlainLiteralObject> =
  [EntityColumn<T>, SortOrder];

/**
 * An ordered list of sort keys — the ORDER BY clause.
 */
export type OrderClause<T extends PlainLiteralObject = PlainLiteralObject> =
  OrderSortKey<T>[];
