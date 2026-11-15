import { type ReferenceId } from '../../reference/interfaces/reference.types.js';

/**
 * A person acting through their roles.
 */
export interface RoleActorInterface {
  kind: 'role';
  roles: readonly string[];
  userId?: ReferenceId;
}
