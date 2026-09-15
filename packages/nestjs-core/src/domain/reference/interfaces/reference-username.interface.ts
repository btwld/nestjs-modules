import { type ReferenceUsername } from './reference.types.js';

/**
 * Identifiable by username.
 */
export interface ReferenceUsernameInterface<T = ReferenceUsername> {
  username: T;
}
