import {
  QueryFields,
  QueryFilter,
  QueryFilterArr,
  QuerySort,
  QuerySortArr,
  SCondition,
} from '../types/crud-request-query.types';

export interface CrudCreateQueryParamsInterface {
  fields?: QueryFields;
  search?: SCondition;
  filter?: QueryFilter | QueryFilterArr | Array<QueryFilter | QueryFilterArr>;
  or?: QueryFilter | QueryFilterArr | Array<QueryFilter | QueryFilterArr>;
  sort?: QuerySort | QuerySortArr | Array<QuerySort | QuerySortArr>;
  limit?: number;
  offset?: number;
  page?: number;
  resetCache?: boolean;
  includeDeleted?: number;
}
