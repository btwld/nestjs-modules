import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

import { createBatchSchema } from '../../../infrastructure/schemas/crud-create-batch.schema.js';

import { photoCreateSchema } from './photo-create.schema.fixture.js';
import { photoSchema } from './photo.schema.fixture.js';

export const photoCreateBatchSchema = withOpenApi(
  createBatchSchema(photoCreateSchema),
);

/**
 * Response shape for the CreateBatch endpoint — a bare array of created
 * photos. Needed because `crud-serialize.interceptor.ts` validates the
 * response against `response.serialization.resource` verbatim; the
 * controller-level `response.resource` schema is a single-item schema, so
 * CreateBatch's operation-level `response` option must supply this array
 * schema explicitly.
 */
export const photoCreateBatchResponseSchema = z.array(photoSchema);
