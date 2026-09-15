import { withNamedComponent } from '@concepta/nestjs-core';
import { paginatedSchema } from '@concepta/nestjs-crud';

import { userSchema } from './user.schema.js';

export const userPaginatedSchema = withNamedComponent(
  paginatedSchema(userSchema),
  'UserPaginated',
);
