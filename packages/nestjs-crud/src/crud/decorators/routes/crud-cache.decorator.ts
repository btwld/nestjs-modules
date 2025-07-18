import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_CACHE_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD cache route decorator.
 *
 * Set the CRUD cache query option.
 */
export const CrudCache = (cache: CrudServiceQueryOptionsInterface['cache']) =>
  SetMetadata(CRUD_MODULE_ROUTE_QUERY_CACHE_METADATA, cache);
