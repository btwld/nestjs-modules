import { PlainLiteralObject } from '@nestjs/common';

import {
  QueryFields,
  QueryFilter,
  QueryFilterArr,
  QuerySort,
  QuerySortArr,
  SCondition,
} from '../types/crud-request-query.types';

export interface CrudCreateQueryParamsInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
> {
  fields?: QueryFields<T>;
  search?: SCondition<T>;
  filter?:
    | QueryFilter<T>
    | QueryFilterArr<T>
    | Array<QueryFilter<T> | QueryFilterArr<T>>;
  or?:
    | QueryFilter<T>
    | QueryFilterArr<T>
    | Array<QueryFilter<T> | QueryFilterArr<T>>;
  sort?: QuerySort<T> | QuerySortArr<T> | Array<QuerySort<T> | QuerySortArr<T>>;
  limit?: number;
  offset?: number;
  page?: number;
  resetCache?: boolean;
  includeDeleted?: number;
}
