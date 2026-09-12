import { CrudListQuery } from '@concepta/nestjs-crud';

import { type RoleInterface } from '../../../../domain/interfaces/role.interface.js';

export class ListRolesRequest extends CrudListQuery<RoleInterface> {}
