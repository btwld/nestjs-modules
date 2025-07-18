import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_MODEL_METADATA } from '../../../crud.constants';
import { CrudModelOptionsInterface } from '../../interfaces/crud-model-options.interface';

/**
 * CRUD Model route decorator.
 *
 * Set the CRUD model, or override the model set by the `@CrudController` decorator.
 */
export const CrudModel = (options: CrudModelOptionsInterface) =>
  SetMetadata(CRUD_MODULE_ROUTE_MODEL_METADATA, options);
