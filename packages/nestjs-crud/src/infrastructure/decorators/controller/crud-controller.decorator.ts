import {
  applyDecorators,
  Controller,
  type PlainLiteralObject,
} from '@nestjs/common';

import { CRUD_MODULE_DEFAULT_PARAMS_OPTIONS } from '../../../crud.constants.js';
import { CrudAdapter as CrudAdapterClass } from '../../adapters/crud.adapter.js';
import { type CrudControllerOptionsInterface } from '../../interfaces/crud-controller-options.interface.js';
import { CrudAdapter } from '../routes/crud-adapter.decorator.js';
import { CrudEntity } from '../routes/crud-entity.decorator.js';
import { CrudName } from '../routes/crud-name.decorator.js';
import { CrudParams } from '../routes/crud-params.decorator.js';
import { CrudRequestBodyBatch } from '../routes/crud-request-body-batch.decorator.js';
import { CrudRequestBody } from '../routes/crud-request-body.decorator.js';
import { CrudResolver } from '../routes/crud-resolver.decorator.js';
import { CrudResponsePaginated } from '../routes/crud-response-paginated.decorator.js';
import { CrudResponseResource } from '../routes/crud-response-resource.decorator.js';
import { CrudSerialize } from '../routes/crud-serialize.decorator.js';
import { CrudValidate } from '../routes/crud-validate.decorator.js';

import { CrudInit } from './crud-init.decorator.js';

/**
 * CRUD controller decorator
 *
 * This decorator is a helper for calling the most common controller level decorators.
 */
export function CrudController<
  T extends PlainLiteralObject = PlainLiteralObject,
>(options: CrudControllerOptionsInterface<T>) {
  // break out options
  const {
    path,
    host,
    entity,
    name,
    adapter = CrudAdapterClass,
    resolver,
    request,
    response,
  } = options;

  // apply all decorators (CrudInit must be last — it resolves query/command metadata)
  return applyDecorators(
    Controller({ path, host }),
    CrudEntity(entity),
    CrudName(name),
    CrudAdapter(adapter),
    CrudResolver(resolver),
    CrudParams<T>(request?.params ?? CRUD_MODULE_DEFAULT_PARAMS_OPTIONS),
    CrudValidate(request?.validation),
    CrudRequestBody(request?.body),
    CrudRequestBodyBatch(request?.bodyBatch),
    CrudResponseResource(response?.resource),
    CrudResponsePaginated(response?.paginated),
    CrudSerialize(response?.serialization),
    CrudInit(),
  );
}
