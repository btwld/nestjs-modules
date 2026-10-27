import { type PlainLiteralObject } from '@nestjs/common';

import {
  type EntityColumn,
  Where,
  type WhereCondition,
} from '@concepta/nestjs-repository';

/**
 * Wire format prefix for comparison operators in query strings.
 */
export const COND_OPERATOR_PREFIX = '$';

export enum CondOperator {
  EQUALS = '$eq',
  NOT_EQUALS = '$ne',
  GREATER_THAN = '$gt',
  LOWER_THAN = '$lt',
  GREATER_THAN_EQUALS = '$gte',
  LOWER_THAN_EQUALS = '$lte',
  STARTS = '$starts',
  NOT_STARTS = '$nstarts',
  ENDS = '$ends',
  NOT_ENDS = '$nends',
  CONTAINS = '$contains',
  NOT_CONTAINS = '$ncontains',
  IN = '$in',
  NOT_IN = '$nin',
  IS_NULL = '$null',
  NOT_NULL = '$nnull',
  BETWEEN = '$between',
}

export type ComparisonOperator = `${CondOperator}`;

/**
 * Shared factory map from $-prefixed wire operators to WhereCondition builders.
 *
 * Used by both CrudQueryParser (URL query string parsing) and
 * SConditionConverter (JSON search parsing). Callers handle their
 * own input validation before invoking these factories.
 */
export const COND_OPERATOR_FACTORY: Record<
  CondOperator,
  (field: string, value: unknown) => WhereCondition
> = {
  [CondOperator.EQUALS]: (f, v) => Where.eq(f, v),
  [CondOperator.NOT_EQUALS]: (f, v) => Where.ne(f, v),
  [CondOperator.GREATER_THAN]: (f, v) => Where.gt(f, v),
  [CondOperator.LOWER_THAN]: (f, v) => Where.lt(f, v),
  [CondOperator.GREATER_THAN_EQUALS]: (f, v) => Where.gte(f, v),
  [CondOperator.LOWER_THAN_EQUALS]: (f, v) => Where.lte(f, v),
  [CondOperator.STARTS]: (f, v) => Where.starts(f, String(v)),
  [CondOperator.NOT_STARTS]: (f, v) => Where.notStarts(f, String(v)),
  [CondOperator.ENDS]: (f, v) => Where.ends(f, String(v)),
  [CondOperator.NOT_ENDS]: (f, v) => Where.notEnds(f, String(v)),
  [CondOperator.CONTAINS]: (f, v) => Where.contains(f, String(v)),
  [CondOperator.NOT_CONTAINS]: (f, v) => Where.notContains(f, String(v)),
  [CondOperator.IN]: (f, v) => Where.in(f, Array.isArray(v) ? v : []),
  [CondOperator.NOT_IN]: (f, v) => Where.notIn(f, Array.isArray(v) ? v : []),
  [CondOperator.IS_NULL]: (f) => Where.isNull(f),
  [CondOperator.NOT_NULL]: (f) => Where.notNull(f),
  [CondOperator.BETWEEN]: (f, v) => {
    const arr = Array.isArray(v) ? v : [];
    return Where.between(f, arr[0], arr[1]);
  },
};

// new search
export type SPrimitivesVal = string | number | boolean;

export type SFieldValues = SPrimitivesVal | Array<SPrimitivesVal>;

export type SFieldOperator = {
  [K in CondOperator]?: SFieldValues;
} & {
  $or?: SFieldOperator;
  $and?: never;
};

export type SField = SPrimitivesVal | SFieldOperator;

export type SFields<T extends PlainLiteralObject> = Partial<
  Record<
    EntityColumn<T>,
    SField | Array<SFields<T> | SConditionAND<T>> | undefined | null
  >
> & {
  $or?: Array<SCondition<T>>;
  $and?: never;
};

export type SConditionAND<T extends PlainLiteralObject> = {
  [key: string]: unknown;
  $and?: Array<SCondition<T>>;
  $or?: never;
};

export type SConditionKey = '$and' | '$or';

export type SCondition<T extends PlainLiteralObject> =
  SFields<T> | SConditionAND<T>;
