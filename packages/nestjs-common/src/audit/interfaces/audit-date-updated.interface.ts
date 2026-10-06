import { type AuditDateUpdated } from './audit.types';

/**
 * Date data was last updated.
 */
export interface AuditDateUpdatedInterface<T = AuditDateUpdated> {
  dateUpdated: T;
}
