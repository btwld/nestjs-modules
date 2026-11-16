import { type PlainLiteralObject } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_EXCLUDE_METADATA } from '../../../crud.constants.js';
import { type CrudQueryOptionsInterface } from '../../request/interfaces/crud-query-options.interface.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD exclude route decorator.
 *
 * Set the CRUD exclude query option.
 */
export const CrudExclude = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_QUERY_EXCLUDE_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      exclude: CrudQueryOptionsInterface<Entity>['exclude'],
    ) =>
      decorator(exclude),
);
