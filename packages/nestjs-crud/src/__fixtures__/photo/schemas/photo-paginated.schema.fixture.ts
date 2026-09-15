import { withNamedComponent } from '@concepta/nestjs-core';

import { paginatedSchema } from '../../../infrastructure/schemas/crud-response-paginated.schema.js';

import { photoSchema } from './photo.schema.fixture.js';

export const photoPaginatedSchema = withNamedComponent(
  paginatedSchema(photoSchema),
  'PhotoPaginated',
);
