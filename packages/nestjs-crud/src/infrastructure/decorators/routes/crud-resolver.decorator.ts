import { CRUD_MODULE_RESOLVER_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadata,
  CrudMetadataLookupTarget,
} from '../../services/crud-metadata.service.js';

/**
 * Set the resolver for a controller.
 *
 * The resolver controls how operations are dispatched at runtime and
 * how handlers are decorated at build time. Applied at the class level only.
 *
 * @example
 * ```typescript
 * @Controller('products')
 * @CrudResolver(CrudCqrsResolver)
 * class ProductController {
 *   // ...
 * }
 * ```
 */
export const CrudResolver = CrudMetadata.createDecorator({
  key: CRUD_MODULE_RESOLVER_METADATA,
  lookupTarget: CrudMetadataLookupTarget.Class,
});
