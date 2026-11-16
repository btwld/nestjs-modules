import { CrudReadQuery } from '@concepta/nestjs-crud';

import { type RoleAssignmentEntityInterface } from '../../../../domain/interfaces/role-assignment-entity.interface.js';

export class ReadRoleAssignmentRequest extends CrudReadQuery<RoleAssignmentEntityInterface> {}
