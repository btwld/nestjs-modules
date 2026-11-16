import { type AuditDateDeleted } from './audit.types.js';

/**
 * Date data was deleted.
 */
export interface AuditDateDeletedInterface<T = AuditDateDeleted> {
  dateDeleted: T;
}
