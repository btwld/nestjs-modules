import { type ReferenceIdInterface } from './reference-id.interface';
import { type ReferenceId } from './reference.types';

/**
 * References a role.
 */
export interface ReferenceRoleInterface<T extends ReferenceId = ReferenceId> {
  role: ReferenceIdInterface<T>;
}
