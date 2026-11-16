import { type ReferenceId } from './reference.types';

/**
 * Identifiable by id.
 *
 * @see https://en.wikipedia.org/wiki/Reference_(computer_science)
 */
export interface ReferenceIdInterface<T = ReferenceId> {
  id: T;
}
