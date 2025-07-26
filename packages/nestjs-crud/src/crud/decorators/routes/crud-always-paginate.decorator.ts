import { PlainLiteralObject, SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_ALWAYS_PAGINATE_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD always paginate route decorator.
 *
 * Set the CRUD always paginate query option.
 */
export const CrudAlwaysPaginate = <
  Entity extends PlainLiteralObject = PlainLiteralObject,
>(
  alwaysPaginate: CrudServiceQueryOptionsInterface<Entity>['alwaysPaginate'],
) =>
  SetMetadata(CRUD_MODULE_ROUTE_QUERY_ALWAYS_PAGINATE_METADATA, alwaysPaginate);
