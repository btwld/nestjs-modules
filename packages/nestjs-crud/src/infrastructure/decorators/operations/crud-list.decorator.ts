import { applyDecorators, Get, type PlainLiteralObject } from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';

import { CrudListHandler } from '../../../application/queries/handlers/crud-list.handler.js';
import { CrudListQuery } from '../../../application/queries/impl/crud-list.query.js';
import { type CrudRouteQueryOptionsInterface } from '../../interfaces/crud-route-ctlr-options.interface.js';
import { getTransactionalDecorators } from '../../utils/get-transactional-decorators.js';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator.js';
import { CrudApiQuery } from '../openapi/crud-api-query.decorator.js';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator.js';
import { CrudOperation } from '../routes/crud-operation.decorator.js';
import { CrudQueryHandler } from '../routes/crud-query-handler.decorator.js';
import { CrudQuery } from '../routes/crud-query.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

/**
 * CRUD List route decorator
 */
export const CrudList = <T extends PlainLiteralObject = PlainLiteralObject>(
  options: CrudRouteQueryOptionsInterface<T> = {},
) => {
  const { path, query, queryHandler, request, response, api, transactional } = {
    ...options,
  };

  return applyDecorators(
    Get(path),
    CrudOperation(Operation.List),
    CrudQuery<T>({ query, queryTemplate: CrudListQuery<T> }),
    CrudQueryHandler<T>({
      handler: queryHandler,
      handlerTemplate: CrudListHandler,
    }),
    CrudValidate(request?.validation),
    CrudSerialize(response?.serialization),
    CrudApiOperation(api?.operation),
    CrudApiQuery(api?.query),
    CrudApiResponse(api?.response),
    ...getTransactionalDecorators(transactional),
  );
};
