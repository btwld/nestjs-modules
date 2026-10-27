import { type AuditDateCreatedInterface } from '../../domain/audit/interfaces/audit-date-created.interface.js';
import { type ReferenceIdInterface } from '../../domain/reference/interfaces/reference-id.interface.js';

import { auditSchema } from './audit.schema.js';
import { conformsTo } from './conforms-to.util.js';
import { referenceIdSchema } from './reference-id.schema.js';

/**
 * Base schema for an `AppendOnlyAggregate`'s entity schema — reference-id +
 * `dateCreated`. Not wrapped with `withOpenApi`/`withNamedComponent` itself;
 * see `audit.schema.ts`.
 */
export const appendOnlyAggregateSchema = conformsTo<
  ReferenceIdInterface & AuditDateCreatedInterface
>()(auditSchema.pick({ dateCreated: true }).extend(referenceIdSchema.shape));
