import { SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_EXCLUDE_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD exclude route decorator.
 *
 * Set the CRUD exclude query option.
 */
export const CrudExclude = (
  fields: CrudServiceQueryOptionsInterface['exclude'],
) => SetMetadata(CRUD_MODULE_ROUTE_QUERY_EXCLUDE_METADATA, fields);
