import { withNamedComponent } from '@concepta/nestjs-core';
import { paginatedSchema } from '@concepta/nestjs-crud';

import { roleSchema } from './role.schema.js';

export const rolePaginatedSchema = withNamedComponent(
  paginatedSchema(roleSchema),
  'RolePaginated',
);
