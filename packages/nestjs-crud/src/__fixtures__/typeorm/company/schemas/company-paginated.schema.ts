import { withOpenApi } from '@concepta/nestjs-core';

import { paginatedSchema } from '../../../../infrastructure/schemas/crud-response-paginated.schema.js';

import { companySchema } from './company.schema.js';

export const companyPaginatedSchema = withOpenApi(
  paginatedSchema(companySchema),
);
