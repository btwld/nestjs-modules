import { type AuditInterface } from '../../audit/interfaces/audit.interface.js';

/**
 * Metadata tracked by domain aggregates.
 *
 * Contains audit timestamps for persistence tracking.
 */
export interface AggregateMetaInterface extends AuditInterface {}
