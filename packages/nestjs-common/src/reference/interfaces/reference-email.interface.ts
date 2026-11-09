import { type ReferenceEmail } from './reference.types';

/**
 * Identifiable by email.
 */
export interface ReferenceEmailInterface<T = ReferenceEmail> {
  email: T;
}
