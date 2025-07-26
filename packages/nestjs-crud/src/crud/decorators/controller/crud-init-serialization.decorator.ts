import { UseInterceptors } from '@nestjs/common';

import { CrudSerializeInterceptor } from '../../interceptors/crud-serialize.interceptor';

/**
 * Crud initialize serialization decorator.
 *
 * Sets up the crud serialize interceptor.
 */
export const CrudInitSerialization = () =>
  UseInterceptors(CrudSerializeInterceptor);
