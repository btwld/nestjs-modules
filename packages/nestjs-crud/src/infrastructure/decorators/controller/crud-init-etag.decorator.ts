import { UseInterceptors } from '@nestjs/common';

import { CrudETagInterceptor } from '../../interceptors/crud-etag.interceptor.js';

/**
 * Crud initialize ETag decorator.
 *
 * Sets up the ETag interceptor, scoped per-controller like
 * `CrudInitSerialization()` — every route this touches is already known to
 * be CRUD-decorated at this point, unlike `CrudContextOverlay`, which has
 * to be a global `APP_INTERCEPTOR` because it's the mechanism that
 * determines that in the first place. Must be applied after
 * `CrudInitSerialization()`: `UseInterceptors` metadata accumulates in
 * application order and runs outer-to-inner, so listing this one second
 * makes it the inner interceptor, letting it see the raw entity before the
 * response schema strips fields off it.
 */
export const CrudInitETag = () => UseInterceptors(CrudETagInterceptor);
