import { type ReferenceSubject } from './reference.types.js';

/**
 * Identifiable by subject (JWT).
 */
export interface ReferenceSubjectInterface<T = ReferenceSubject> {
  sub: T;
}
