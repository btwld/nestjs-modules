import { SetMetadata } from '@nestjs/common';

import { ROUTE_AUDIT_PUBLIC_ROUTE_METADATA } from '../route-audit.constants.js';

/**
 * Marks a route, or every route of a controller, as deliberately open to
 * callers who aren't signed in.
 *
 * The mark opens nothing by itself: it tells route audit rules that a route
 * without a sign-in is on purpose. The authentication module's
 * `@AuthPublic()` sets it alongside opening the route, so most applications
 * never apply it directly; a guard of your own that lets some routes through
 * applies it on those routes.
 *
 * @example
 * ```ts
 * @Get('health')
 * @PublicRoute()
 * health() {}
 * ```
 */
export const PublicRoute = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROUTE_AUDIT_PUBLIC_ROUTE_METADATA, true);
