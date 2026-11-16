import { type PlainLiteralObject } from '@nestjs/common';

import {
  type EntityColumn,
  type JoinClause,
  type OrderSortKey,
} from '@concepta/nestjs-repository';

import { type QueryFilterOption } from '../query-filter-option.type.js';

export interface CrudQueryOptionsInterface<T extends PlainLiteralObject> {
  allow?: EntityColumn<T>[];
  exclude?: EntityColumn<T>[];
  persist?: EntityColumn<T>[];
  filter?: QueryFilterOption<T>;
  sort?: OrderSortKey<T>[];
  limit?: number;
  maxLimit?: number;
  cache?: number | false;
  join?: JoinClause[];
}
