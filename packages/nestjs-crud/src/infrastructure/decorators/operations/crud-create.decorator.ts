import { applyDecorators, type PlainLiteralObject, Post } from '@nestjs/common';

import { Operation } from '@concepta/nestjs-core';

import { CrudCreateHandler } from '../../../application/commands/handlers/crud-create.handler.js';
import { CrudCreateCommand } from '../../../application/commands/impl/crud-create.command.js';
import { type CrudRouteCommandOptionsInterface } from '../../interfaces/crud-route-ctlr-options.interface.js';
import { getTransactionalDecorators } from '../../utils/get-transactional-decorators.js';
import { CrudApiBody } from '../openapi/crud-api-body.decorator.js';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator.js';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator.js';
import { CrudCommandHandler } from '../routes/crud-command-handler.decorator.js';
import { CrudCommand } from '../routes/crud-command.decorator.js';
import { CrudOperation } from '../routes/crud-operation.decorator.js';
import { CrudRequestBody } from '../routes/crud-request-body.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

/**
 * CRUD Create route decorator
 */
export const CrudCreate = <T extends PlainLiteralObject = PlainLiteralObject>(
  options: CrudRouteCommandOptionsInterface<T> = {},
) => {
  const {
    path,
    command,
    commandHandler,
    request,
    response,
    api,
    transactional,
  } = {
    ...options,
  };

  const bodySchema = request?.body;

  return applyDecorators(
    Post(path),
    CrudOperation(Operation.Create),
    CrudCommand<T>({ command, commandTemplate: CrudCreateCommand }),
    CrudCommandHandler<T>({
      handler: commandHandler,
      handlerTemplate: CrudCreateHandler<T>,
    }),
    // Store this operation's body schema at method level so it overrides the
    // controller-level default for validation and docs resolution.
    ...(bodySchema === undefined ? [] : [CrudRequestBody(bodySchema)]),
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
