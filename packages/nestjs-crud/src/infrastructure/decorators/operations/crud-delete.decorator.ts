import {
  applyDecorators,
  Delete,
  HttpCode,
  HttpStatus,
  type PlainLiteralObject,
} from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';

import { CrudDeleteHandler } from '../../../application/commands/handlers/crud-delete.handler.js';
import { CrudDeleteCommand } from '../../../application/commands/impl/crud-delete.command.js';
import { CRUD_MODULE_ROUTE_ID_DEFAULT_PATH } from '../../../crud.constants.js';
import { type CrudRouteCommandOptionsInterface } from '../../interfaces/crud-route-ctlr-options.interface.js';
import { getTransactionalDecorators } from '../../utils/get-transactional-decorators.js';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator.js';
import { CrudApiParam } from '../openapi/crud-api-param.decorator.js';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator.js';
import { CrudCommandHandler } from '../routes/crud-command-handler.decorator.js';
import { CrudCommand } from '../routes/crud-command.decorator.js';
import { CrudOperation } from '../routes/crud-operation.decorator.js';
import { CrudReturnDeleted } from '../routes/crud-return-deleted.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

/**
 * CRUD Delete route decorator (hard delete)
 */
export const CrudDelete = <T extends PlainLiteralObject = PlainLiteralObject>(
  options: CrudRouteCommandOptionsInterface<T> = {},
) => {
  const {
    path = CRUD_MODULE_ROUTE_ID_DEFAULT_PATH,
    command,
    commandHandler,
    request,
    response,
    api,
    transactional,
  } = { ...options };

  const status =
    response?.returnDeleted === true ? HttpStatus.OK : HttpStatus.NO_CONTENT;

  return applyDecorators(
    Delete(path),
    HttpCode(status),
    CrudOperation(Operation.Delete),
    CrudCommand<T>({ command: command, commandTemplate: CrudDeleteCommand }),
    CrudCommandHandler<T>({
      handler: commandHandler,
      handlerTemplate: CrudDeleteHandler<T>,
    }),
    CrudReturnDeleted(response?.returnDeleted),
    CrudValidate(request?.validation),
    CrudSerialize(response?.serialization),
    CrudApiOperation(api?.operation),
    CrudApiParam(api?.params),
    CrudApiResponse(api?.response),
    ...getTransactionalDecorators(transactional),
  );
};
