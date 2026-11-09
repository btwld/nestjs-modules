import { type AuditDateUpdated } from './audit.types.js';

/**
 * Date data was last updated.
 */
export interface AuditDateUpdatedInterface<T = AuditDateUpdated> {
  dateUpdated: T;
}
