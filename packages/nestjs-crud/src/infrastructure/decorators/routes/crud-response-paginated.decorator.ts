import { CRUD_MODULE_RESPONSE_PAGINATED_METADATA } from '../../../crud.constants.js';
import { type CrudSchema } from '../../../crud.types.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Set the response schema for paginated responses.
 *
 * Can be applied at controller level (default) or method level (override).
 */
export const CrudResponsePaginated = CrudMetadata.createDecorator<CrudSchema>({
  key: CRUD_MODULE_RESPONSE_PAGINATED_METADATA,
  lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
});
