import { PlainLiteralObject, SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_LIMIT_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD limit route decorator.
 *
 * Set the CRUD limit query option.
 */
export const CrudLimit = <
  Entity extends PlainLiteralObject = PlainLiteralObject,
>(
  limit: CrudServiceQueryOptionsInterface<Entity>['limit'],
) => SetMetadata(CRUD_MODULE_ROUTE_QUERY_LIMIT_METADATA, limit);
