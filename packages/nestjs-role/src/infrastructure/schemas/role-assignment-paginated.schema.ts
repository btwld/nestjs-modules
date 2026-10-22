import { withNamedComponent } from '@concepta/nestjs-core';
import { paginatedSchema } from '@concepta/nestjs-crud';

import { roleAssignmentSchema } from './role-assignment.schema.js';

export const roleAssignmentPaginatedSchema = withNamedComponent(
  paginatedSchema(roleAssignmentSchema),
  'RoleAssignmentPaginated',
);
