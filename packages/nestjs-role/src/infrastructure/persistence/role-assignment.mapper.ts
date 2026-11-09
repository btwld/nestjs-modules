import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { RoleAssignment } from '../../domain/aggregates/role-assignment.js';
import { type RoleAssignmentEntityInterface } from '../../domain/interfaces/role-assignment-entity.interface.js';

export class RoleAssignmentMapper extends DomainMapper<
  RoleAssignmentEntityInterface,
  RoleAssignment
> {
  /**
   * Picks the role assignment's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: RoleAssignmentEntityInterface): RoleAssignment {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      assigneeId,
      roleId,
    } = entity;

    return new RoleAssignment(id, { assigneeId, roleId }, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(roleAssignment: RoleAssignment) {
    return roleAssignment.toPlain();
  }
}
