import { ClassTransformOptions } from 'class-transformer';

import {
  QueryFields,
  QueryFilter,
  QuerySort,
  SCondition,
} from '../types/crud-request-query.types';

export interface CrudRequestParsedParamsInterface {
  fields: QueryFields;
  paramsFilter: QueryFilter[];
  classTransformOptions: ClassTransformOptions | undefined;
  search: SCondition | undefined;
  filter: QueryFilter[];
  or: QueryFilter[];
  sort: QuerySort[];
  limit: number | undefined;
  offset: number | undefined;
  page: number | undefined;
  cache: number | undefined;
  includeDeleted: number | undefined;
}
