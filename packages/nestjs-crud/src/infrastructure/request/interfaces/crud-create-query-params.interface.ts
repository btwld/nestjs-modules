import { type PlainLiteralObject } from '@nestjs/common';

import {
  type EntityColumn,
  type OrderSortKey,
  type OrderSortKeyArr,
  type WhereCondition,
  type WhereConditionArr,
} from '@concepta/nestjs-repository';

import { type SCondition } from '../crud-query.types.js';

export interface CrudCreateQueryParamsInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  fields?: EntityColumn<T>[];
  search?: SCondition<T>;
  filter?:
    | WhereCondition<T>
    | WhereConditionArr<T>
    | Array<WhereCondition<T> | WhereConditionArr<T>>;
  or?:
    | WhereCondition<T>
    | WhereConditionArr<T>
    | Array<WhereCondition<T> | WhereConditionArr<T>>;
  sort?:
    | OrderSortKey<T>
    | OrderSortKeyArr<T>
    | Array<OrderSortKey<T> | OrderSortKeyArr<T>>;
  limit?: number;
  offset?: number;
  page?: number;
  resetCache?: boolean;
  includeDeleted?: number;
}
