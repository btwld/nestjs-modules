import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { CRUD_MODULE_ROUTE_REQUIRE_VERSION_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD require version route decorator.
 *
 * When set to true, the route rejects with 428 Precondition Required
 * unless the request carries an `If-Match` header naming a version — also
 * documenting that response in OpenAPI. Applies to Update, Replace,
 * Delete, SoftDelete, and Restore operations.
 */
export const CrudRequireVersion = CrudMetadata.createWrappedDecorator<
  boolean,
  (value?: boolean) => MethodDecorator & ClassDecorator
>(
  {
    key: CRUD_MODULE_ROUTE_REQUIRE_VERSION_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  },
  (decorator) => (value?: boolean) =>
    applyDecorators(
      decorator(value),
      ...(value
        ? [
            ApiResponse({
              status: 428,
              description: 'An If-Match header naming a version is required',
            }),
          ]
        : []),
    ),
);
