import { withOpenApi } from '@concepta/nestjs-core';

import { paginatedSchema } from '../../../../infrastructure/schemas/crud-response-paginated.schema.js';

import { userProfileSchema } from './user-profile.schema.js';

export const userProfilePaginatedSchema = withOpenApi(
  paginatedSchema(userProfileSchema),
);
