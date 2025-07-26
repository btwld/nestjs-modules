import { ClassTransformOptions } from 'class-transformer';

import { PlainLiteralObject } from '@nestjs/common';

import {
  QueryFields,
  QueryFilter,
  QuerySort,
  SCondition,
} from '../types/crud-request-query.types';

export interface CrudRequestParsedParamsInterface<
  T extends PlainLiteralObject,
> {
  fields: QueryFields<T>;
  paramsFilter: QueryFilter<T>[];
  classTransformOptions: ClassTransformOptions | undefined;
  search: SCondition<T> | undefined;
  filter: QueryFilter<T>[];
  or: QueryFilter<T>[];
  sort: QuerySort<T>[];
  limit: number | undefined;
  offset: number | undefined;
  page: number | undefined;
  cache: number | undefined;
  includeDeleted: number | undefined;
}
