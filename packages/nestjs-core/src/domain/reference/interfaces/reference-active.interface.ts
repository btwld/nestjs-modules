import { type ReferenceActive } from './reference.types.js';

/**
 * Identifiable by active.
 */
export interface ReferenceActiveInterface<T = ReferenceActive> {
  active: T;
}
