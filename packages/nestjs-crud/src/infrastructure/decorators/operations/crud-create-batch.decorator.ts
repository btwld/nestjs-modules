import { applyDecorators, type PlainLiteralObject, Post } from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';

import { CrudCreateBatchHandler } from '../../../application/commands/handlers/crud-create-batch.handler.js';
import { CrudCreateBatchCommand } from '../../../application/commands/impl/crud-create-batch.command.js';
import { CRUD_MODULE_ROUTE_CREATE_MANY_DEFAULT_PATH } from '../../../crud.constants.js';
import { type CrudRouteCommandOptionsInterface } from '../../interfaces/crud-route-ctlr-options.interface.js';
import { getTransactionalDecorators } from '../../utils/get-transactional-decorators.js';
import { CrudApiBody } from '../openapi/crud-api-body.decorator.js';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator.js';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator.js';
import { CrudCommandHandler } from '../routes/crud-command-handler.decorator.js';
import { CrudCommand } from '../routes/crud-command.decorator.js';
import { CrudOperation } from '../routes/crud-operation.decorator.js';
import { CrudRequestBodyBatch } from '../routes/crud-request-body-batch.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

/**
 * CRUD Create Batch route decorator
 */
export const CrudCreateBatch = <
  T extends PlainLiteralObject = PlainLiteralObject,
>(
  options: CrudRouteCommandOptionsInterface<T> = {},
) => {
  const {
    path = CRUD_MODULE_ROUTE_CREATE_MANY_DEFAULT_PATH,
    command: command,
    commandHandler: commandHandler,
    request,
    response,
    api,
    transactional,
  } = { ...options };

  const bodyBatchSchema = request?.bodyBatch;

  return applyDecorators(
    Post(path),
    CrudOperation(Operation.CreateBatch),
    CrudCommand<T>({
      command: command,
      commandTemplate: CrudCreateBatchCommand,
    }),
    CrudCommandHandler<T>({
      handler: commandHandler,
      handlerTemplate: CrudCreateBatchHandler,
    }),
    // Store this operation's body schema at method level so it overrides the
    // controller-level default for validation and docs resolution.
    ...(bodyBatchSchema === undefined
      ? []
      : [CrudRequestBodyBatch(bodyBatchSchema)]),
    CrudValidate(request?.validation),
    CrudSerialize(response?.serialization),
    CrudApiOperation(api?.operation),
    // Stores api.body for crud-init-api-body.decorator.ts to read and merge
    // into the ApiBody() it builds from the resolved request body schema.
    CrudApiBody(api?.body),
    CrudApiResponse(api?.response),
    ...getTransactionalDecorators(transactional),
  );
};
