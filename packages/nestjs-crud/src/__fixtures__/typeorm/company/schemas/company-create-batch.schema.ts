import { withOpenApi } from '@concepta/nestjs-core';

import { createBatchSchema } from '../../../../infrastructure/schemas/crud-create-batch.schema.js';

import { companyCreateSchema } from './company-create.schema.js';

export const companyCreateBatchSchema = withOpenApi(
  createBatchSchema(companyCreateSchema),
);
