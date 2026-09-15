import { withOpenApi } from '@concepta/nestjs-core';
import { createBatchSchema } from '@concepta/nestjs-crud';

import { roleCreateSchema } from './role-create.schema.js';

export const roleCreateBatchSchema = withOpenApi(
  createBatchSchema(roleCreateSchema),
);
