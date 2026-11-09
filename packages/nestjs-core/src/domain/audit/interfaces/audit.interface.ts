import { type AuditDateCreatedInterface } from './audit-date-created.interface.js';
import { type AuditDateDeletedInterface } from './audit-date-deleted.interface.js';
import { type AuditDateUpdatedInterface } from './audit-date-updated.interface.js';

/**
 * Audit metadata for persistence tracking.
 */
export interface AuditInterface
  extends
    AuditDateCreatedInterface,
    AuditDateUpdatedInterface,
    AuditDateDeletedInterface {}
