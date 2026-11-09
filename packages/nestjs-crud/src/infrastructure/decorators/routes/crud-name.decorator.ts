import { CRUD_MODULE_CONTROLLER_NAME_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Set the controller name used for CQRS class naming.
 *
 * Applied at controller level.
 */
export const CrudName = CrudMetadata.createDecorator<string>({
  key: CRUD_MODULE_CONTROLLER_NAME_METADATA,
  lookupTarget: CrudMetadataLookupTarget.Class,
});
