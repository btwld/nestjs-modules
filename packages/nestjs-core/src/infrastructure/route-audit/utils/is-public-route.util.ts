import { ROUTE_AUDIT_PUBLIC_ROUTE_METADATA } from '../route-audit.constants.js';

/**
 * Whether any of the given targets, a route's handler or its controller,
 * carries `@PublicRoute()`.
 *
 * @example
 * ```ts
 * isPublicRoute(context.getHandler(), context.getClass());
 * ```
 */
export function isPublicRoute(...targets: object[]): boolean {
  return targets.some(
    (target) =>
      Reflect.getMetadata(ROUTE_AUDIT_PUBLIC_ROUTE_METADATA, target) === true,
  );
}
