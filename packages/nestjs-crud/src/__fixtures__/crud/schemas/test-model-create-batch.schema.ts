import { createBatchSchema } from '../../../infrastructure/schemas/crud-create-batch.schema.js';

import { testModelCreateSchema } from './test-model-create.schema.js';

export const testModelCreateBatchSchema = createBatchSchema(
  testModelCreateSchema,
);
