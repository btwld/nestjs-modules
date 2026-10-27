import { z } from 'zod';

import { type AuditInterface } from '../../domain/audit/interfaces/audit.interface.js';

import { conformsTo } from './conforms-to.util.js';

/**
 * Audit schema. Composed into concrete entity schemas via `.extend()` —
 * never used standalone as a request/response schema, so it is not
 * wrapped with `withOpenApi`/`withNamedComponent` (only the final,
 * concrete entity schema is).
 */
export const auditSchema = conformsTo<AuditInterface>()(
  z.object({
    dateCreated: z.date(),
    dateUpdated: z.date(),
    dateDeleted: z.date().nullable(),
  }),
);
