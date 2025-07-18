import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_SORT_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD sort route decorator.
 *
 * Set the CRUD sort query option.
 */
export const CrudSort = (sort: CrudServiceQueryOptionsInterface['sort']) =>
  SetMetadata(CRUD_MODULE_ROUTE_QUERY_SORT_METADATA, sort);
