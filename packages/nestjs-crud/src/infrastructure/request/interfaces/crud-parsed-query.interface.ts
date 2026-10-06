import { type PlainLiteralObject } from '@nestjs/common';

import {
  type EntityColumn,
  type OrderSortKey,
  type WhereCondition,
} from '@concepta/nestjs-repository';

import { type SCondition } from '../crud-query.types.js';

/**
 * Interface representing parsed query string parameters from a CRUD request.
 *
 * Contains filter, sort, pagination, and other query configurations
 * parsed from the request query string. Route parameters are stored
 * separately in CrudContextInterface.params.
 */
export interface CrudParsedQueryInterface<T extends PlainLiteralObject> {
  fields: EntityColumn<T>[];
  search: SCondition<T> | undefined;
  filter: WhereCondition<T>[];
  or: WhereCondition<T>[];
  sort: OrderSortKey<T>[];
  limit: number | undefined;
  offset: number | undefined;
  page: number | undefined;
  cache: number | undefined;
  includeDeleted: number | undefined;
}
