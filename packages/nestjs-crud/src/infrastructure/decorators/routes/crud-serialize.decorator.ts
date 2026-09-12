import { CRUD_MODULE_ROUTE_SERIALIZATION_METADATA } from '../../../crud.constants.js';
import { type CrudSerializationOptionsInterface } from '../../interfaces/crud-serialization-options.interface.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * CRUD serialize route decorator
 */
export const CrudSerialize =
  CrudMetadata.createDecorator<CrudSerializationOptionsInterface>({
    key: CRUD_MODULE_ROUTE_SERIALIZATION_METADATA,
    lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  });
