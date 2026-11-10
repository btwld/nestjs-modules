import { type AccessControlContextInterface } from './access-control-context.interface.js';

/**
 * An access query service: decides a checked route from its context, such
 * as whether the record a call names is the actor's own.
 */
export interface CanAccess {
  canAccess(context: AccessControlContextInterface): Promise<boolean>;
}
