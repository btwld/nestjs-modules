import { type ReferenceUsername } from './reference.types';

/**
 * Identifiable by username.
 */
export interface ReferenceUsernameInterface<T = ReferenceUsername> {
  username: T;
}
