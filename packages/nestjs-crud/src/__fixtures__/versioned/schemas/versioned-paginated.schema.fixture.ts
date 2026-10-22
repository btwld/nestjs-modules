import { withNamedComponent } from '@concepta/nestjs-core';

import { paginatedSchema } from '../../../infrastructure/schemas/crud-response-paginated.schema.js';

import { versionedSchema } from './versioned.schema.fixture.js';

export const versionedPaginatedSchema = withNamedComponent(
  paginatedSchema(versionedSchema),
  'VersionedPaginated',
);
