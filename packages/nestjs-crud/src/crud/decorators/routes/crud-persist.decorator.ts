import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_PERSIST_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD persist route decorator.
 *
 * Set the CRUD persist query option.
 */
export const CrudPersist = (
  persist: CrudServiceQueryOptionsInterface['persist'],
) => SetMetadata(CRUD_MODULE_ROUTE_QUERY_PERSIST_METADATA, persist);
