import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { RoleAssignment } from '../../domain/aggregates/role-assignment.js';
import { type RoleAssignmentEntityInterface } from '../../domain/interfaces/role-assignment-entity.interface.js';

export class RoleAssignmentMapper extends DomainMapper<
  RoleAssignmentEntityInterface,
  RoleAssignment
> {
  createAggregate(entity: RoleAssignmentEntityInterface): RoleAssignment {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } =
      entity;
    return new RoleAssignment(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(roleAssignment: RoleAssignment) {
    return roleAssignment.toPlain();
  }
}
