import { type AuditedRouteInterface } from './audited-route.interface.js';

/**
 * A controller, with the path its module is mounted at by `RouterModule`, or
 * `''`.
 */
export interface MountedControllerInterface {
  readonly controller: AuditedRouteInterface['controller'];
  readonly modulePath: string;
}
