import { type PlainLiteralObject } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_QUERY_JOIN_METADATA } from '../../../crud.constants.js';
import { type CrudQueryOptionsInterface } from '../../request/interfaces/crud-query-options.interface.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD join route decorator.
 *
 * Set the CRUD join query option.
 */
export const CrudJoin = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_QUERY_JOIN_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
    dedupeBy: 'relation',
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      join: CrudQueryOptionsInterface<Entity>['join'],
    ) =>
      decorator(join),
);
