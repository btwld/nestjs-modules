import { CrudCreateCommand } from '@concepta/nestjs-crud';

import { type RoleCreatableInterface } from '../../../../domain/interfaces/role-creatable.interface.js';
import { type RoleInterface } from '../../../../domain/interfaces/role.interface.js';

export class CreateRoleRequest extends CrudCreateCommand<
  RoleInterface,
  RoleCreatableInterface
> {}
