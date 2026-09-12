import { withOpenApi } from '@concepta/nestjs-core';
import { createBatchSchema } from '@concepta/nestjs-crud';

import { userCreateSchema } from './user-create.schema.js';

export const userCreateBatchSchema = withOpenApi(
  createBatchSchema(userCreateSchema),
);
