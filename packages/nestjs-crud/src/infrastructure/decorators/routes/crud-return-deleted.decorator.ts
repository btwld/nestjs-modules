import { CRUD_MODULE_ROUTE_RETURN_DELETED_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD return deleted route decorator.
 *
 * When set to true, the deleted entity will be returned in the response.
 * Applies to Delete and SoftDelete operations.
 */
export const CrudReturnDeleted = CrudMetadata.createDecorator<boolean>({
  key: CRUD_MODULE_ROUTE_RETURN_DELETED_METADATA,
  lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
});
