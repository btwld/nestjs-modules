import { DomainMapper } from '@concepta/nestjs-core/aggregate';

import { Role } from '../../domain/aggregates/role.js';
import { type RoleEntityInterface } from '../../domain/interfaces/role-entity.interface.js';
import { type RoleInterface } from '../../domain/interfaces/role.interface.js';

export class RoleMapper extends DomainMapper<
  RoleEntityInterface,
  RoleInterface,
  Role
> {
  createAggregate(entity: RoleEntityInterface): Role {
    const { id, version, dateCreated, dateUpdated, dateDeleted, ...props } =
      entity;

    return new Role(id, props, version, {
      dateCreated,
      dateUpdated,
      dateDeleted,
    });
  }
}
