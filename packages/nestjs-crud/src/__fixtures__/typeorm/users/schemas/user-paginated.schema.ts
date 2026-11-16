import { withOpenApi } from '@concepta/nestjs-core';

import { paginatedSchema } from '../../../../infrastructure/schemas/crud-response-paginated.schema.js';

import { userSchema } from './user.schema.js';

export const userPaginatedSchema = withOpenApi(paginatedSchema(userSchema));
