import { type PlainLiteralObject } from '@nestjs/common';

import {
  type EntityColumn,
  type WhereArrayOperator,
  type WhereCompoundOperator,
  type WhereNullaryOperator,
  WhereOperator,
  type WherePairOperator,
  type WhereScalarOperator,
} from '../repository.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// WhereCondition variants — discriminated union on `operator`
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Condition without a value (IS_NULL, NOT_NULL).
 */
export interface WhereConditionNullary<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  field: EntityColumn<T>;
  operator: WhereNullaryOperator;
  relation?: string;
}

/**
 * Condition with a scalar value (EQ, NE, GT, GTE, LT, LTE, pattern ops).
 */
export interface WhereConditionScalar<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  field: EntityColumn<T>;
  operator: WhereScalarOperator;
  value: unknown;
  relation?: string;
}

/**
 * Condition with an array value (IN, NIN).
 */
export interface WhereConditionArray<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  field: EntityColumn<T>;
  operator: WhereArrayOperator;
  value: unknown[];
  relation?: string;
}

/**
 * Condition with a pair value (BETWEEN).
 */
export interface WhereConditionPair<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  field: EntityColumn<T>;
  operator: WherePairOperator;
  value: [unknown, unknown];
  relation?: string;
}

/**
 * A condition on a single entity field — discriminated union on `operator`.
 */
export type WhereCondition<T extends PlainLiteralObject = PlainLiteralObject> =
  | WhereConditionNullary<T>
  | WhereConditionScalar<T>
  | WhereConditionArray<T>
  | WhereConditionPair<T>;

// ═══════════════════════════════════════════════════════════════════════════════
// Compound clauses
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A compound condition combining other clauses.
 */
export interface WhereCompound {
  operator: WhereCompoundOperator;
  conditions: WhereClause[];
}

/**
 * A single node in the where clause AST.
 */
export type WhereClause = WhereCondition | WhereCompound;

// ═══════════════════════════════════════════════════════════════════════════════
// Type guards
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard to distinguish field conditions from compounds.
 */
export function isWhereCondition(c: WhereClause): c is WhereCondition {
  return 'field' in c && 'operator' in c;
}

/**
 * Type guard to distinguish compound clauses from field conditions.
 */
export function isWhereCompound(c: WhereClause): c is WhereCompound {
  return 'conditions' in c && 'operator' in c;
}

/**
 * Type guard for nullary conditions (IS_NULL, NOT_NULL).
 */
export function isNullaryCondition<T extends PlainLiteralObject>(
  c: WhereCondition<T>,
): c is WhereConditionNullary<T> {
  return (
    c.operator === WhereOperator.IS_NULL ||
    c.operator === WhereOperator.NOT_NULL
  );
}

/**
 * Type guard for array conditions (IN, NIN).
 */
export function isArrayCondition<T extends PlainLiteralObject>(
  c: WhereCondition<T>,
): c is WhereConditionArray<T> {
  return c.operator === WhereOperator.IN || c.operator === WhereOperator.NIN;
}

/**
 * Type guard for pair conditions (BETWEEN).
 */
export function isPairCondition<T extends PlainLiteralObject>(
  c: WhereCondition<T>,
): c is WhereConditionPair<T> {
  return c.operator === WhereOperator.BETWEEN;
}
