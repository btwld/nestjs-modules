import { CrudReadHandler } from '@concepta/nestjs-crud';

import { type RoleInterface } from '../../../../domain/interfaces/role.interface.js';

export class ReadRoleRequestHandler extends CrudReadHandler<RoleInterface> {}
