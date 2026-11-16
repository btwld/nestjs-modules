import { applyDecorators, Get, type PlainLiteralObject } from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';

import { CrudReadHandler } from '../../../application/queries/handlers/crud-read.handler.js';
import { CrudReadQuery } from '../../../application/queries/impl/crud-read.query.js';
import { CRUD_MODULE_ROUTE_ID_DEFAULT_PATH } from '../../../crud.constants.js';
import { type CrudRouteQueryOptionsInterface } from '../../interfaces/crud-route-ctlr-options.interface.js';
import { getTransactionalDecorators } from '../../utils/get-transactional-decorators.js';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator.js';
import { CrudApiParam } from '../openapi/crud-api-param.decorator.js';
import { CrudApiQuery } from '../openapi/crud-api-query.decorator.js';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator.js';
import { CrudOperation } from '../routes/crud-operation.decorator.js';
import { CrudQueryHandler } from '../routes/crud-query-handler.decorator.js';
import { CrudQuery } from '../routes/crud-query.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

/**
 * CRUD Read route decorator
 */
export const CrudRead = <T extends PlainLiteralObject = PlainLiteralObject>(
  options: CrudRouteQueryOptionsInterface<T> = {},
) => {
  const {
    path = CRUD_MODULE_ROUTE_ID_DEFAULT_PATH,
    query,
    queryHandler,
    request,
    response,
    api,
    transactional,
  } = { ...options };

  return applyDecorators(
    Get(path),
    CrudOperation(Operation.Read),
    CrudQuery<T>({ query, queryTemplate: CrudReadQuery<T> }),
    CrudQueryHandler<T>({
      handler: queryHandler,
      handlerTemplate: CrudReadHandler<T>,
    }),
    CrudValidate(request?.validation),
    CrudSerialize(response?.serialization),
    CrudApiOperation(api?.operation),
    CrudApiQuery(api?.query),
    CrudApiParam(api?.params),
    CrudApiResponse(api?.response),
    ...getTransactionalDecorators(transactional),
  );
};
