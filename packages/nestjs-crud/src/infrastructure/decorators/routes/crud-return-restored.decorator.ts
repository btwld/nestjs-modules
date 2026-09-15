import { CRUD_MODULE_ROUTE_RETURN_RESTORED_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD return restored route decorator.
 *
 * When set to true, the restored entity will be returned in the response.
 * Applies to Restore operation.
 */
export const CrudReturnRestored = CrudMetadata.createDecorator<boolean>({
  key: CRUD_MODULE_ROUTE_RETURN_RESTORED_METADATA,
  lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
});
