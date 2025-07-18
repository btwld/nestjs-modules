import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_PARAMS_METADATA } from '../../../crud.constants';
import { CrudParamsOptionsInterface } from '../../interfaces/crud-params-options.interface';

/**
 * CRUD Params route decorator.
 *
 * Set the CRUD params.
 */
export const CrudParams = (params: CrudParamsOptionsInterface) =>
  SetMetadata(CRUD_MODULE_ROUTE_PARAMS_METADATA, params);
