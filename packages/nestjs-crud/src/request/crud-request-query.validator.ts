import { PlainLiteralObject } from '@nestjs/common';
import { isNil, isNumber, isObject } from '@nestjs/common/utils/shared.utils';

import { isArrayStrings, isStringFull } from '../util/validation';

import { CrudRequestQueryException } from './exceptions/crud-request-query.exception';
import { CrudRequestParamsOptionsInterface } from './interfaces/crud-request-params-options.interface';
import {
  ComparisonOperator,
  CondOperator,
  QueryFields,
  QueryFilter,
  QuerySortOperator,
} from './types/crud-request-query.types';

export const deprecatedComparisonOperatorsList = [
  'eq',
  'ne',
  'gt',
  'lt',
  'gte',
  'lte',
  'starts',
  'ends',
  'cont',
  'excl',
  'in',
  'notin',
  'isnull',
  'notnull',
  'between',
];
export const comparisonOperatorsList = [
  ...deprecatedComparisonOperatorsList,
  ...Object.keys(CondOperator).map(
    (n) => CondOperator[n as keyof typeof CondOperator],
  ),
];

export const sortOrdersList = ['ASC', 'DESC'];

const comparisonOperatorsListStr = comparisonOperatorsList.join();
const sortOrdersListStr = sortOrdersList.join();

export function validateFields<T extends PlainLiteralObject>(
  fields: QueryFields<T>,
): void {
  if (!isArrayStrings(fields)) {
    throw new CrudRequestQueryException({
      message: 'Invalid fields. Array of strings expected',
    });
  }
}

export function validateCondition<T extends PlainLiteralObject>(
  val: QueryFilter<T>,
  cond: 'filter' | 'or' | 'search',
): void {
  if (!isObject(val) || !isStringFull(val.field)) {
    throw new CrudRequestQueryException({
      message: `Invalid field type in ${cond} condition. String expected`,
    });
  }
  validateComparisonOperator(val.operator);
}

export function validateComparisonOperator(operator: ComparisonOperator): void {
  if (!comparisonOperatorsList.includes(operator)) {
    throw new CrudRequestQueryException({
      message: `Invalid comparison operator. ${comparisonOperatorsListStr} expected`,
    });
  }
}

export function isSortOrder(value: unknown): value is QuerySortOperator {
  return value === 'ASC' || value === 'DESC';
}

export function validateSort(sort: { field?: unknown; order?: unknown }): void {
  if (
    !isObject(sort) ||
    'field' in sort === false ||
    !isStringFull(sort.field)
  ) {
    throw new CrudRequestQueryException({
      message: 'Invalid sort field. String expected',
    });
  }
  if (!isSortOrder(sort.order)) {
    throw new CrudRequestQueryException({
      message: `Invalid sort order. ${sortOrdersListStr} expected`,
    });
  }
}

export function validateNumeric(
  val: number,
  num: 'limit' | 'offset' | 'page' | 'cache' | 'include_deleted' | string,
): void {
  if (!isNumber(val)) {
    throw new CrudRequestQueryException({
      message: `Invalid ${num}. Number expected`,
    });
  }
}

export function validateParamOption<T extends PlainLiteralObject>(
  options: CrudRequestParamsOptionsInterface<T>,
  name: string,
) {
  if (!isObject(options)) {
    throw new CrudRequestQueryException({
      message: `Invalid param ${name}. Invalid crud options`,
    });
  }
  const option = options[name];
  if (option && option.disabled) {
    return;
  }
  if (!isObject(option) || isNil(option.field) || isNil(option.type)) {
    throw new CrudRequestQueryException({
      message: 'Invalid param option in Crud',
    });
  }
}

export function validateUUID(str: string, name: string) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidV4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidV4.test(str) && !uuid.test(str)) {
    throw new CrudRequestQueryException({
      message: `Invalid param ${name}. UUID string expected`,
    });
  }
}
