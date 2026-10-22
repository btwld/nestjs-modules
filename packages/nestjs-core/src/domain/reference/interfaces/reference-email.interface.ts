import { type ReferenceEmail } from './reference.types.js';

/**
 * Identifiable by email.
 */
export interface ReferenceEmailInterface<T = ReferenceEmail> {
  email: T;
}
