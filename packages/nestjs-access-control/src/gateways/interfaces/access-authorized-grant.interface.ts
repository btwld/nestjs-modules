import { type AccessControlGrantOptionInterface } from '../../domain/interfaces/access-control-grant-option.interface.js';
import { type AccessResolutionInterface } from '../../domain/interfaces/access-resolution.interface.js';

/** A route grant the module's authority allowed, and the rules to check it by. */
export interface AccessAuthorizedGrantInterface {
  grant: AccessControlGrantOptionInterface;
  resolution: AccessResolutionInterface;
}
