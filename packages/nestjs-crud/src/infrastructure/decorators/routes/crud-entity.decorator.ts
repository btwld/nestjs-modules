import { CRUD_MODULE_CONTROLLER_ENTITY_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Set the entity key used for repository injection tokens.
 *
 * Applied at controller level.
 */
export const CrudEntity = CrudMetadata.createDecorator<string>({
  key: CRUD_MODULE_CONTROLLER_ENTITY_METADATA,
  lookupTarget: CrudMetadataLookupTarget.Class,
});
