import { type AuditDateCreated } from './audit.types.js';

/**
 * Date data was created.
 */
export interface AuditDateCreatedInterface<T = AuditDateCreated> {
  dateCreated: T;
}
