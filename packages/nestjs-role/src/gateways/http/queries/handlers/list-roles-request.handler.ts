import { CrudListHandler } from '@concepta/nestjs-crud';

import { type RoleInterface } from '../../../../domain/interfaces/role.interface.js';

export class ListRolesRequestHandler extends CrudListHandler<RoleInterface> {}
