import { withOpenApi } from '@concepta/nestjs-core';
import { createBatchSchema } from '@concepta/nestjs-crud';

import { roleAssignmentCreateSchema } from './role-assignment-create.schema.js';

export const roleAssignmentCreateBatchSchema = withOpenApi(
  createBatchSchema(roleAssignmentCreateSchema),
);
