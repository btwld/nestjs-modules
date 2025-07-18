import { applyDecorators, Controller } from '@nestjs/common';

import { CRUD_MODULE_DEFAULT_PARAMS_OPTIONS } from '../../../crud.constants';
import { CrudControllerOptionsInterface } from '../../interfaces/crud-controller-options.interface';
import { CrudModel } from '../routes/crud-model.decorator';
import { CrudParams } from '../routes/crud-params.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudValidate } from '../routes/crud-validate.decorator';

import { CrudInitApiParams } from './crud-init-api-params.decorator';
import { CrudInitApiQuery } from './crud-init-api-query.decorator';
import { CrudInitApiResponse } from './crud-init-api-response.decorator';
import { CrudInitSerialization } from './crud-init-serialization.decorator';
import { CrudInitValidation } from './crud-init-validation.decorator';

/**
 * CRUD controller decorator
 *
 * This decorator is a helper for calling the most common controller level decorators.
 */
export function CrudController(options: CrudControllerOptionsInterface) {
  // break out options
  const { path, host, ...moreOptions } = options;

  // apply all decorators
  return applyDecorators(
    Controller({ path, host }),
    CrudModel(moreOptions.model),
    CrudParams(moreOptions.params ?? CRUD_MODULE_DEFAULT_PARAMS_OPTIONS),
    CrudValidate(moreOptions.validation),
    CrudSerialize(moreOptions.serialization),
    CrudInitValidation(),
    CrudInitSerialization(),
    CrudInitApiQuery(),
    CrudInitApiParams(),
    CrudInitApiResponse(),
  );
}
