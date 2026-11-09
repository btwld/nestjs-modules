import { CrudDeleteCommand } from '@concepta/nestjs-crud';

import { type RoleInterface } from '../../../../domain/interfaces/role.interface.js';

export class DeleteRoleRequest extends CrudDeleteCommand<RoleInterface> {}
