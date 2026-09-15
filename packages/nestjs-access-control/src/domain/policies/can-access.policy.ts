import { type AccessControlContextInterface } from '../interfaces/access-control-context.interface.js';

export interface CanAccess {
  canAccess(context: AccessControlContextInterface): Promise<boolean>;
}
