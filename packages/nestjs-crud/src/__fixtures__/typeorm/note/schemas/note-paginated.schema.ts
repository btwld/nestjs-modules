import { withOpenApi } from '@concepta/nestjs-core';

import { paginatedSchema } from '../../../../infrastructure/schemas/crud-response-paginated.schema.js';

import { noteSchema } from './note.schema.js';

export const notePaginatedSchema = withOpenApi(paginatedSchema(noteSchema));
