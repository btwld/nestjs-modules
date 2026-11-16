import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type CrudQueryHandlerInterface } from '../../../application/queries/interfaces/crud-query-handler.interface.js';
import { CRUD_MODULE_ROUTE_QUERY_HANDLER_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Options for CrudQueryHandler decorator.
 */
export interface CrudQueryHandlerOptionsInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Relations extends PlainLiteralObject[] = PlainLiteralObject[],
> {
  /** Custom query (query handler) class to use directly */
  handler?: Type<CrudQueryHandlerInterface<Entity, Relations>>;
  /** Base query class for generating default query handler class */
  handlerTemplate?: Type<CrudQueryHandlerInterface<Entity, Relations>>;
  /** Resolved query handler class (set by CrudInitQuery) */
  resolved?: Type<CrudQueryHandlerInterface<Entity, Relations>>;
}

/**
 * CRUD Query Handler route decorator.
 *
 * Stores query handler options as metadata. The actual handler class is resolved
 * later by CrudInitQueryHandler, which applies defaults and generates classes.
 */
export const CrudQueryHandler = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_QUERY_HANDLER_METADATA,
    lookupTarget: CrudMetadataLookupTarget.Method,
  },
  (decorator) =>
    <
      Entity extends PlainLiteralObject = PlainLiteralObject,
      Relations extends PlainLiteralObject[] = PlainLiteralObject[],
    >(
      options: CrudQueryHandlerOptionsInterface<Entity, Relations> = {},
    ) =>
      decorator(options),
);
