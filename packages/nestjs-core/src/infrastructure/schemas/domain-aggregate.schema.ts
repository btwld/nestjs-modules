import { z } from 'zod';

import { type AuditInterface } from '../../domain/audit/interfaces/audit.interface.js';
import { type ReferenceIdInterface } from '../../domain/reference/interfaces/reference-id.interface.js';
import { type ReferenceVersionInterface } from '../../domain/reference/interfaces/reference-version.interface.js';

import { auditSchema } from './audit.schema.js';
import { conformsTo } from './conforms-to.util.js';
import { referenceIdSchema } from './reference-id.schema.js';

/**
 * Base schema for concrete entity schemas — merges audit + reference-id +
 * version fields. Not wrapped with `withOpenApi`/`withNamedComponent`
 * itself; see `audit.schema.ts`.
 */
export const domainAggregateSchema = conformsTo<
  ReferenceIdInterface & ReferenceVersionInterface & AuditInterface
>()(
  auditSchema.extend({
    ...referenceIdSchema.shape,
    version: z.number(),
  }),
);
