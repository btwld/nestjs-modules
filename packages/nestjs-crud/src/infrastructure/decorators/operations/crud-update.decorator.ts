import {
  applyDecorators,
  Patch,
  type PlainLiteralObject,
} from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';

import { CrudUpdateHandler } from '../../../application/commands/handlers/crud-update.handler.js';
import { CrudUpdateCommand } from '../../../application/commands/impl/crud-update.command.js';
import { CRUD_MODULE_ROUTE_ID_DEFAULT_PATH } from '../../../crud.constants.js';
import { type CrudRouteCommandOptionsInterface } from '../../interfaces/crud-route-ctlr-options.interface.js';
import { getTransactionalDecorators } from '../../utils/get-transactional-decorators.js';
import { CrudApiBody } from '../openapi/crud-api-body.decorator.js';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator.js';
import { CrudApiParam } from '../openapi/crud-api-param.decorator.js';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator.js';
import { CrudCommandHandler } from '../routes/crud-command-handler.decorator.js';
import { CrudCommand } from '../routes/crud-command.decorator.js';
import { CrudOperation } from '../routes/crud-operation.decorator.js';
import { CrudRequestBody } from '../routes/crud-request-body.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

/**
 * CRUD Update route decorator
 */
export const CrudUpdate = <T extends PlainLiteralObject = PlainLiteralObject>(
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

  const bodySchema = request?.body;

  return applyDecorators(
    Patch(path),
    CrudOperation(Operation.Update),
    CrudCommand<T>({ command, commandTemplate: CrudUpdateCommand }),
    CrudCommandHandler<T>({
      handler: commandHandler,
      handlerTemplate: CrudUpdateHandler<T>,
    }),
    // Store this operation's body schema at method level so it overrides the
    // controller-level default for validation and docs resolution.
    ...(bodySchema === undefined ? [] : [CrudRequestBody(bodySchema)]),
    CrudValidate(request?.validation),
    CrudSerialize(response?.serialization),
    CrudApiOperation(api?.operation),
    CrudApiParam(api?.params),
    // Stores api.body for crud-init-api-body.decorator.ts to read and merge
    // into the ApiBody() it builds from the resolved request body schema.
    CrudApiBody(api?.body),
    CrudApiResponse(api?.response),
    ...getTransactionalDecorators(transactional),
  );
};
