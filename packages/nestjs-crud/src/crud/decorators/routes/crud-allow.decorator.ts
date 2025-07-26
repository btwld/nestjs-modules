import { PlainLiteralObject, SetMetadata } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_ALLOW_METADATA } from '../../../crud.constants';
import { CrudServiceQueryOptionsInterface } from '../../interfaces/crud-service-query-options.interface';

/**
 * CRUD allow route decorator.
 *
 * Set the CRUD allow query option.
 */
export const CrudAllow = <
  Entity extends PlainLiteralObject = PlainLiteralObject,
>(
  fields: CrudServiceQueryOptionsInterface<Entity>['allow'],
) => SetMetadata(CRUD_MODULE_ROUTE_QUERY_ALLOW_METADATA, fields);
