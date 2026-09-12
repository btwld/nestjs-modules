import { type PlainLiteralObject } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_SORT_METADATA } from '../../../crud.constants.js';
import { type CrudQueryOptionsInterface } from '../../request/interfaces/crud-query-options.interface.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD sort route decorator.
 *
 * Set the CRUD sort query option.
 */
export const CrudSort = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_QUERY_SORT_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
    dedupeBy: 'field',
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      sort: CrudQueryOptionsInterface<Entity>['sort'],
    ) =>
      decorator(sort),
);
