import { z } from 'zod';

import { type PlainLiteralObject } from '@nestjs/common';

import { isNil, isNumber, isObject } from '@concepta/nestjs-core';
import {
  type EntityColumn,
  SortOrder,
  type WhereCondition,
  WhereOperator,
} from '@concepta/nestjs-repository';

import { type CrudParamsOptionsInterface } from '../interfaces/crud-params-options.interface.js';
import { isArrayStrings, isStringFull } from '../utils/validation.js';

import { type ComparisonOperator, CondOperator } from './crud-query.types.js';
import { CrudQueryValidatorException } from './exceptions/crud-query-validator.exception.js';

export const COMPARISON_OPERATORS: CondOperator[] = Object.values(CondOperator);

export const SORT_OPERATORS: SortOrder[] = Object.values(SortOrder);

export function validateFields<T extends PlainLiteralObject>(
  fields: EntityColumn<T>[],
): void {
  if (!isArrayStrings(fields)) {
    throw new CrudQueryValidatorException({
      message: 'Invalid fields. Array of strings expected',
    });
  }
}

export function validateCondition<T extends PlainLiteralObject>(
  val: WhereCondition<T>,
  cond: 'filter' | 'or',
): void {
  if (!isObject(val) || !isStringFull(val.field)) {
    throw new CrudQueryValidatorException({
      message: `Invalid field type in ${cond} condition. String expected`,
    });
  }
  if (!Object.values(WhereOperator).includes(val.operator)) {
    throw new CrudQueryValidatorException({
      message: `Invalid comparison operator. ${Object.values(WhereOperator).join()} expected`,
    });
  }
}

export function validateComparisonOperator(
  operator: string,
): asserts operator is ComparisonOperator {
  if (!COMPARISON_OPERATORS.some((op) => op === operator)) {
    throw new CrudQueryValidatorException({
      message: `Invalid comparison operator. ${COMPARISON_OPERATORS.join()} expected`,
    });
  }
}

export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === 'string' && SORT_OPERATORS.some((op) => op === value);
}

export function validateSort(sort: {
  field?: unknown;
  order?: unknown;
}): asserts sort is { field: string; order: SortOrder } {
  if (
    !isObject(sort) ||
    'field' in sort === false ||
    !isStringFull(sort.field)
  ) {
    throw new CrudQueryValidatorException({
      message: 'Invalid sort field. String expected',
    });
  }
  if (!isSortOrder(sort.order)) {
    throw new CrudQueryValidatorException({
      message: `Invalid sort order. ${SORT_OPERATORS.join()} expected`,
    });
  }
}

export function validateNumeric(
  val: number,
  num: 'limit' | 'offset' | 'page' | 'cache' | 'includeDeleted' | string,
): void {
  if (!isNumber(val)) {
    throw new CrudQueryValidatorException({
      message: `Invalid ${num}. Number expected`,
    });
  }
}

export function validateParamOption<T extends PlainLiteralObject>(
  options: CrudParamsOptionsInterface<T>,
  name: string,
) {
  if (!isObject(options)) {
    throw new CrudQueryValidatorException({
      message: `Invalid param ${name}. Invalid crud options`,
    });
  }
  const option = options[name];
  if (option && option.disabled) {
    return;
  }
  if (!isObject(option) || isNil(option.field) || isNil(option.type)) {
    throw new CrudQueryValidatorException({
      message: 'Invalid param option in Crud',
    });
  }
}

const uuidSchema = z.uuid();

export function validateUUID(str: string, name: string) {
  if (!uuidSchema.safeParse(str).success) {
    throw new CrudQueryValidatorException({
      message: `Invalid param ${name}. UUID string expected`,
    });
  }
}
