import { withNamedComponent } from '@concepta/nestjs-core';
import { paginatedSchema } from '@concepta/nestjs-crud';

import { cacheSchema } from './cache.schema.js';

export const cachePaginatedSchema = withNamedComponent(
  paginatedSchema(cacheSchema),
  'CachePaginated',
);
