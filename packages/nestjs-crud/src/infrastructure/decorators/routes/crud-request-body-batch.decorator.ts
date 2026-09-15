import { CRUD_MODULE_REQUEST_BODY_BATCH_METADATA } from '../../../crud.constants.js';
import { type CrudSchema } from '../../../crud.types.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Set the expected body schema for batch mutations (createBatch).
 *
 * Can be applied at controller level (default) or method level (override).
 */
export const CrudRequestBodyBatch = CrudMetadata.createDecorator<CrudSchema>({
  key: CRUD_MODULE_REQUEST_BODY_BATCH_METADATA,
  lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
});
