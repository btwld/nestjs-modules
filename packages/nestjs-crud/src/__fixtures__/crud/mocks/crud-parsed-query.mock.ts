import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudParsedQueryInterface } from '../../../infrastructure/request/interfaces/crud-parsed-query.interface.js';

export function mockCrudParsedQuery<T extends PlainLiteralObject>(
  overrides: Partial<CrudParsedQueryInterface<T>> = {},
): CrudParsedQueryInterface<T> {
  return {
    fields: [],
    search: undefined,
    filter: [],
    or: [],
    sort: [],
    limit: undefined,
    offset: undefined,
    page: undefined,
    cache: undefined,
    includeDeleted: undefined,
    ...overrides,
  };
}
