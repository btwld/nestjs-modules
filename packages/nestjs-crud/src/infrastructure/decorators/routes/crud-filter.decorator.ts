import { type PlainLiteralObject } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_FILTER_METADATA } from '../../../crud.constants.js';
import { type CrudQueryOptionsInterface } from '../../request/interfaces/crud-query-options.interface.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD filter route decorator.
 *
 * Set the CRUD filter query option.
 */
export const CrudFilter = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_QUERY_FILTER_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      filters: CrudQueryOptionsInterface<Entity>['filter'],
    ) =>
      decorator(filters),
);
