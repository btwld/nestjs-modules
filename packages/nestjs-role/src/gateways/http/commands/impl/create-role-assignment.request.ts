import { CrudCreateCommand } from '@concepta/nestjs-crud';

import { type RoleAssignmentCreatableInterface } from '../../../../domain/interfaces/role-assignment-creatable.interface.js';
import { type RoleAssignmentEntityInterface } from '../../../../domain/interfaces/role-assignment-entity.interface.js';

export class CreateRoleAssignmentRequest extends CrudCreateCommand<
  RoleAssignmentEntityInterface,
  RoleAssignmentCreatableInterface
> {}
