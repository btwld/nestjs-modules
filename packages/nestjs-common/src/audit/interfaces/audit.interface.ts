import { type AuditDateCreatedInterface } from './audit-date-created.interface';
import { type AuditDateDeletedInterface } from './audit-date-deleted.interface';
import { type AuditDateUpdatedInterface } from './audit-date-updated.interface';

/**
 * Audit metadata for persistence tracking.
 */
export interface AuditInterface
  extends
    AuditDateCreatedInterface,
    AuditDateUpdatedInterface,
    AuditDateDeletedInterface {}
