import { type AccessRefusedDetailsInterface } from './access-refused-details.interface.js';
import { type AccessResolutionInterface } from './access-resolution.interface.js';

/**
 * What the module's authority answered for an action on a resource: the
 * resolution to check it against, or why it was refused.
 */
export type AccessAuthorization =
  | { allowed: true; resolution: AccessResolutionInterface }
  | { allowed: false; refusal: AccessRefusedDetailsInterface };
