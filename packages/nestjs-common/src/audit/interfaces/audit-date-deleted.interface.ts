import { type AuditDateDeleted } from './audit.types';

/**
 * Date data was deleted.
 */
export interface AuditDateDeletedInterface<T = AuditDateDeleted> {
  dateDeleted: T;
}
