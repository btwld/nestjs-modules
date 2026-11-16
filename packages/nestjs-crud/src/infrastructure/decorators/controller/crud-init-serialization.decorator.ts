import { UseInterceptors } from '@nestjs/common';

import { CrudSerializeInterceptor } from '../../interceptors/crud-serialize.interceptor.js';

/**
 * Crud initialize serialization decorator.
 *
 * Sets up the crud serialize interceptor.
 */
export const CrudInitSerialization = () =>
  UseInterceptors(CrudSerializeInterceptor);
