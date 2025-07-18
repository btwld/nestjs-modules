import {
  QueryFilter,
  SCondition,
} from '../../request/types/crud-request-query.types';

import { QueryFilterFunction } from './query-filter-function.type';

export type QueryFilterOption =
  | QueryFilter[]
  | SCondition
  | QueryFilterFunction;
