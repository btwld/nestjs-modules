import { type AuditedRouteInterface } from './audited-route.interface.js';

/**
 * What a route audit rule checks: the application's HTTP routes and the
 * guards that run on every one of them.
 */
export interface RouteAuditSubjectInterface {
  readonly routes: readonly AuditedRouteInterface[];
  /**
   * The classes of the global guards (`APP_GUARD` providers and
   * `app.useGlobalGuards()`). A request-scoped guard built by a factory
   * provider has no class to report and is left out.
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  readonly globalGuards: readonly Function[];
}
