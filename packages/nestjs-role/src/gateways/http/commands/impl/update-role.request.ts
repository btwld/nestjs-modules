import { CrudUpdateCommand } from '@concepta/nestjs-crud';

import { type RoleUpdatableInterface } from '../../../../domain/interfaces/role-updatable.interface.js';
import { type RoleInterface } from '../../../../domain/interfaces/role.interface.js';

export class UpdateRoleRequest extends CrudUpdateCommand<
  RoleInterface,
  RoleUpdatableInterface
> {}
