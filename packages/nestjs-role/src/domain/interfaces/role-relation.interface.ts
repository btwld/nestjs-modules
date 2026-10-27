import { type ReferenceId } from '@concepta/nestjs-core';

/**
 * Belongs to role.
 */
export interface RoleRelationInterface<T extends ReferenceId = ReferenceId> {
  roleId: T;
}
