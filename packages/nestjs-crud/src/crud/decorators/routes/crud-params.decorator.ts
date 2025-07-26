import { PlainLiteralObject, SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_PARAMS_METADATA } from '../../../crud.constants';
import { CrudParamsOptionsInterface } from '../../interfaces/crud-params-options.interface';

/**
 * CRUD Params route decorator.
 *
 * Set the CRUD params.
 */
export const CrudParams = <T extends PlainLiteralObject = PlainLiteralObject>(
  params: CrudParamsOptionsInterface<T>,
) => SetMetadata(CRUD_MODULE_ROUTE_PARAMS_METADATA, params);
