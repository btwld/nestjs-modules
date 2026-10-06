import { type PlainLiteralObject } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_PARAMS_METADATA } from '../../../crud.constants.js';
import { type CrudParamsOptionsInterface } from '../../interfaces/crud-params-options.interface.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD Params route decorator.
 *
 * Set the CRUD params.
 */
export const CrudParams = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_PARAMS_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      params: CrudParamsOptionsInterface<Entity>,
    ) =>
      decorator(params),
);
