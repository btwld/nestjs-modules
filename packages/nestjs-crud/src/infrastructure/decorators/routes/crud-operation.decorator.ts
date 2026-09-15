import { type Operation } from '@concepta/nestjs-core';

import { CRUD_MODULE_ROUTE_OPERATION_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD operation route decorator.
 */
export const CrudOperation = CrudMetadata.createDecorator<Operation>({
  key: CRUD_MODULE_ROUTE_OPERATION_METADATA,
  lookupTarget: CrudMetadataLookupTarget.Method,
});
