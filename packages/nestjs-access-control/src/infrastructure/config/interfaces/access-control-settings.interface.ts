import { type AccessGrants } from '../../../domain/interfaces/access-grants.type.js';

export interface AccessControlSettingsInterface {
  /**
   * Rules keyed by actor, `role:<name>` or `system:<name>`, used by the
   * default grants provider. Validated at startup. Left out, nothing is
   * granted.
   */
  grants?: AccessGrants;
}
