import { PlainLiteralObject } from '@nestjs/common';

import {
  QueryFilter,
  SCondition,
} from '../../request/types/crud-request-query.types';

import { QueryFilterFunction } from './query-filter-function.type';

export type QueryFilterOption<T extends PlainLiteralObject> =
  | QueryFilter<T>[]
  | SCondition<T>
  | QueryFilterFunction<T>;
