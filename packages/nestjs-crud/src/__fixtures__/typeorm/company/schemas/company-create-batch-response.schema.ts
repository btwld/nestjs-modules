import { z } from 'zod';

import { companySchema } from './company.schema.js';

/**
 * Response shape for the CreateBatch endpoint — a bare array of created
 * companies. Needed because `crud-serialize.interceptor.ts` validates the
 * response against `response.serialization.resource` verbatim; the
 * controller-level `response.resource` schema is a single-item schema, so
 * CreateBatch's operation-level `response` option must supply this array
 * schema explicitly. Mirrors the identical pattern already established for
 * the photo fixture (`photoCreateBatchResponseSchema`).
 */
export const companyCreateBatchResponseSchema = z.array(companySchema);
