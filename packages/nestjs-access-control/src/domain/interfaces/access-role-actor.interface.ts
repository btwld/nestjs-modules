import { type ReferenceId } from '@concepta/nestjs-core';

/**
 * A person acting through their roles. Their grants are the rules for each
 * of their roles, plus any rules for them alone.
 */
export interface AccessRoleActorInterface {
  kind: 'role';
  roles: string[];
  userId?: ReferenceId;
}
