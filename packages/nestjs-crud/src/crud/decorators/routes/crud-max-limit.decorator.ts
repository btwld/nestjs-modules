import { PlainLiteralObject, SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_MAX_LIMIT_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD max limit route decorator.
 *
 * Set the CRUD max limit query option.
 */
export const CrudMaxLimit = <
  Entity extends PlainLiteralObject = PlainLiteralObject,
>(
  maxLimit: CrudServiceQueryOptionsInterface<Entity>['maxLimit'],
) => SetMetadata(CRUD_MODULE_ROUTE_QUERY_MAX_LIMIT_METADATA, maxLimit);
