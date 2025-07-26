import { PlainLiteralObject, SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_SOFT_DELETE_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD soft delete route decorator.
 *
 * Set the CRUD soft delete query option.
 */
export const CrudSoftDelete = <
  Entity extends PlainLiteralObject = PlainLiteralObject,
>(
  softDelete: CrudServiceQueryOptionsInterface<Entity>['softDelete'],
) => SetMetadata(CRUD_MODULE_ROUTE_QUERY_SOFT_DELETE_METADATA, softDelete);
