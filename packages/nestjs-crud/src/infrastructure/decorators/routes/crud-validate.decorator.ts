import { type PlainLiteralObject } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_VALIDATION_METADATA } from '../../../crud.constants.js';
import { type CrudValidationOptions } from '../../../crud.types.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Crud validate options decorator.
 *
 * Set the fallback ValidationPipe options for all method
 * parameters called with the `CrudBody` decorator.
 *
 * If this decorator is used on a controller, it will use the given options for
 * every controller method's Crud param that does NOT have validations explicitly set.
 *
 * If this decorator is used on a method, it will use the given options for
 * every Crud parameter on the method that does NOT have validations explicitly set.
 *
 * @param options - crud validation options
 */
export const CrudValidate = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_VALIDATION_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      options?: CrudValidationOptions<Entity>,
    ) =>
      decorator(options),
);
