import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type CrudQueryInterface } from '../../../application/queries/interfaces/crud-query.interface.js';
import { CRUD_MODULE_ROUTE_QUERY_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Options for CrudQuery decorator.
 */
export type CrudQueryDecoratorOptionsInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> = {
  /** Custom query (query) class to use directly */
  query?: Type<CrudQueryInterface<Entity>>;
  /** Base query class for generating default query class */
  queryTemplate?: Type<CrudQueryInterface<Entity>>;
  /** Resolved query class (set by CrudInitQuery) */
  resolved?: Type<CrudQueryInterface<Entity>>;
};

/**
 * CRUD Query route decorator.
 *
 * Stores query options as metadata. The actual query class is resolved
 * later by CrudInitQuery, which applies defaults and generates classes.
 */
export const CrudQuery = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_QUERY_METADATA,
    lookupTarget: CrudMetadataLookupTarget.Method,
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      options: CrudQueryDecoratorOptionsInterface<Entity>,
    ) =>
      decorator(options),
);
