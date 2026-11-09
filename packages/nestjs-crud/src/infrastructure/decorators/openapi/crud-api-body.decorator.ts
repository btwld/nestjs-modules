import { type ApiBodyOptions } from '@nestjs/swagger';

import { CRUD_MODULE_API_BODY_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * \@CrudApiBody() open api decorator.
 *
 * Stores the operation's `api.body` `ApiBodyOptions` for
 * `crud-init-api-body.decorator.ts` to read and merge into the `@ApiBody()`
 * it builds from the resolved request body schema — the same
 * store-then-apply split `CrudApiParam`/`CrudApiQuery`/`CrudApiResponse`
 * already use. `standardSchema` always wins over a caller-supplied
 * `schema`/`type` (`@nestjs/swagger`'s own `SchemaObjectFactory` omits both
 * before spreading the converted schema back in last), so a caller-supplied
 * `schema`/`type` here is accepted but has no effect.
 */
export const CrudApiBody = CrudMetadata.createDecorator<ApiBodyOptions>({
  key: CRUD_MODULE_API_BODY_METADATA,
  lookupTarget: CrudMetadataLookupTarget.Method,
});
