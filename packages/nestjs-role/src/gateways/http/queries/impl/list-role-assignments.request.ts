import { CrudListQuery } from '@concepta/nestjs-crud';

import { type RoleAssignmentEntityInterface } from '../../../../domain/interfaces/role-assignment-entity.interface.js';

export class ListRoleAssignmentsRequest extends CrudListQuery<RoleAssignmentEntityInterface> {}
