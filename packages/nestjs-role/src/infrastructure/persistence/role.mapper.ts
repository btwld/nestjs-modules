import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Role } from '../../domain/aggregates/role.js';
import { type RoleEntityInterface } from '../../domain/interfaces/role-entity.interface.js';

export class RoleMapper extends DomainMapper<RoleEntityInterface, Role> {
  /**
   * Picks the role's own fields, so a relation the consumer's entity loads
   * never reaches the aggregate, or a write.
   */
  createAggregate(entity: RoleEntityInterface): Role {
    const {
      id,
      version,
      dateCreated,
      dateUpdated,
      dateDeleted,
      name,
      description,
    } = entity;

    return new Role(id, { name, description }, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }

  toPersistence(role: Role) {
    return role.toPlain();
  }
}
