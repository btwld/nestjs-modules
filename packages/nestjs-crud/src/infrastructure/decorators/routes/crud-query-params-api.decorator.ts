import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

import { Operation } from '@concepta/nestjs-core';

import { Swagger } from '../../utils/swagger.helper.js';

/**
 * \@CrudQueryParamsApi() method decorator
 *
 * Documents CRUD's standard query-string contract (filter, or, sort,
 * fields, limit, offset, page, cache, includeDeleted) via `@ApiQuery` — the
 * exact same set `Swagger.createQueryParamsMeta` already generates for
 * `@CrudList`/`@CrudRead` routes — applied immediately at decoration time.
 * No class-scanning, no dependency on `CrudInit()`.
 *
 * Pair with `@CrudQueryParams()` on the same hand-written method to fully
 * document the query it validates.
 */
export const CrudQueryParamsApi = (): MethodDecorator =>
  applyDecorators(
    ...Swagger.createQueryParamsMeta(Operation.List).map((meta) =>
      ApiQuery(meta),
    ),
  );
