import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_FILTER_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD filter route decorator.
 *
 * Set the CRUD filter query option.
 */
export const CrudFilter = (
  filters: CrudServiceQueryOptionsInterface['filter'],
) => SetMetadata(CRUD_MODULE_ROUTE_QUERY_FILTER_METADATA, filters);
