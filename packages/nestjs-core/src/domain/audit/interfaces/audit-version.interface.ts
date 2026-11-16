import { type AuditVersion } from './audit.types.js';

/**
 * The latest version of the data.
 */
export interface AuditVersionInterface<T = AuditVersion> {
  version: T;
}
