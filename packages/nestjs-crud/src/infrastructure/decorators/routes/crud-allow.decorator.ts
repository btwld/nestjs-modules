import { type PlainLiteralObject } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_ALLOW_METADATA } from '../../../crud.constants.js';
import { type CrudQueryOptionsInterface } from '../../request/interfaces/crud-query-options.interface.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD allow route decorator.
 *
 * Set the CRUD allow query option.
 */
export const CrudAllow = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_QUERY_ALLOW_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      fields: CrudQueryOptionsInterface<Entity>['allow'],
    ) =>
      decorator(fields),
);
