import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_SERIALIZATION_METADATA } from '../../../crud.constants';
import { CrudSerializationOptionsInterface } from '../../interfaces/crud-serialization-options.interface';

/**
 * CRUD serialize route decorator
 */
export const CrudSerialize = (options?: CrudSerializationOptionsInterface) =>
  SetMetadata(CRUD_MODULE_ROUTE_SERIALIZATION_METADATA, options);
