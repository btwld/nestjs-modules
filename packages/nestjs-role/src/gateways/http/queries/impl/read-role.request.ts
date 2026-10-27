import { CrudReadQuery } from '@concepta/nestjs-crud';

import { type RoleInterface } from '../../../../domain/interfaces/role.interface.js';

export class ReadRoleRequest extends CrudReadQuery<RoleInterface> {}
