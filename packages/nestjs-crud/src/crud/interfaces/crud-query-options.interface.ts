import {
  QueryFields,
  QuerySort,
} from '../../request/types/crud-request-query.types';
import { QueryFilterOption } from '../types/query-filter-option.type';

export interface CrudQueryOptionsInterface {
  allow?: QueryFields;
  exclude?: QueryFields;
  persist?: QueryFields;
  filter?: QueryFilterOption;
  sort?: QuerySort[];
  limit?: number;
  maxLimit?: number;
  cache?: number | false;
  alwaysPaginate?: boolean;
  softDelete?: boolean;
}
