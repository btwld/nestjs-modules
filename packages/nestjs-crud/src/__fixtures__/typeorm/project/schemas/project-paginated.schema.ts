import { withOpenApi } from '@concepta/nestjs-core';

import { paginatedSchema } from '../../../../infrastructure/schemas/crud-response-paginated.schema.js';

import { projectSchema } from './project.schema.js';

export const projectPaginatedSchema = withOpenApi(
  paginatedSchema(projectSchema),
);
