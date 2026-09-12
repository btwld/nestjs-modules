import {
  applyDecorators,
  HttpCode,
  HttpStatus,
  Patch,
  type PlainLiteralObject,
} from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';

import { CrudRestoreHandler } from '../../../application/commands/handlers/crud-restore.handler.js';
import { CrudRestoreCommand } from '../../../application/commands/impl/crud-restore.command.js';
import { CRUD_MODULE_ROUTE_RESTORE_DEFAULT_PATH } from '../../../crud.constants.js';
import { type CrudRouteCommandOptionsInterface } from '../../interfaces/crud-route-ctlr-options.interface.js';
import { getTransactionalDecorators } from '../../utils/get-transactional-decorators.js';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator.js';
import { CrudApiParam } from '../openapi/crud-api-param.decorator.js';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator.js';
import { CrudCommandHandler } from '../routes/crud-command-handler.decorator.js';
import { CrudCommand } from '../routes/crud-command.decorator.js';
import { CrudOperation } from '../routes/crud-operation.decorator.js';
import { CrudReturnRestored } from '../routes/crud-return-restored.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

/**
 * CRUD Restore route decorator
 */
export const CrudRestore = <T extends PlainLiteralObject = PlainLiteralObject>(
  options: CrudRouteCommandOptionsInterface<T> = {},
) => {
  const {
    path = CRUD_MODULE_ROUTE_RESTORE_DEFAULT_PATH,
    command,
    commandHandler,
    request,
    response,
    api,
    transactional,
  } = { ...options };

  const status =
    response?.returnRestored === true ? HttpStatus.OK : HttpStatus.NO_CONTENT;

  return applyDecorators(
    Patch(path),
    HttpCode(status),
    CrudOperation(Operation.Restore),
    CrudCommand<T>({ command, commandTemplate: CrudRestoreCommand }),
    CrudCommandHandler<T>({
      handler: commandHandler,
      handlerTemplate: CrudRestoreHandler<T>,
    }),
    CrudReturnRestored(response?.returnRestored),
    CrudValidate(request?.validation),
    CrudSerialize(response?.serialization),
    CrudApiOperation(api?.operation),
    CrudApiParam(api?.params),
    CrudApiResponse(api?.response),
    ...getTransactionalDecorators(transactional),
  );
};
