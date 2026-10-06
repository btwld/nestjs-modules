import {
  createParamDecorator,
  type ExecutionContext,
  type PlainLiteralObject,
} from '@nestjs/common';

import { CrudQueryParser } from '../../request/crud-query.parser.js';
import { type CrudParsedQueryInterface } from '../../request/interfaces/crud-parsed-query.interface.js';

/**
 * \@CrudQueryParams() parameter decorator
 *
 * Parses and validates CRUD's standard query-string contract (filter, or,
 * sort, fields, limit, offset, page, cache, includeDeleted) via
 * `CrudQueryParser` — the same parser generated `@CrudList`/`@CrudRead`
 * routes use — without depending on `@CrudController`, an entity, or a
 * `@Crud<Operation>` tag. `CrudContextOverlay` (and, with it, `@Ctx(CrudCtx)`
 * and `ctx.query`) only populates for methods carrying one of the nine
 * canonical CRUD operations; a hand-written endpoint that doesn't fit one of
 * those — a custom search/aggregate/report route — has no other way to reuse
 * this validated contract.
 *
 * Malformed input throws `CrudQueryParserException`, which surfaces as a
 * plain HTTP 400 the same way a pipe's rejection would.
 *
 * Route **path** params are out of scope here — Nest's native `@Param()`
 * already covers those with no friction.
 */
export const CrudQueryParams = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): CrudParsedQueryInterface<PlainLiteralObject> => {
    const request = ctx.switchToHttp().getRequest();
    return CrudQueryParser.create().parseQuery(request.query).getParsedQuery();
  },
);
