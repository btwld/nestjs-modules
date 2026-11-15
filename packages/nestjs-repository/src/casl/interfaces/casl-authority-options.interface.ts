/**
 * What `CaslAuthority`'s rules may name besides the entities it governs and
 * the six actions a repository asks.
 */
export interface CaslAuthorityOptionsInterface {
  /**
   * Subjects that are not entities it governs, such as a route's resource
   * that access control asks it about.
   */
  subjects?: readonly string[];
  /** Verbs of your own, such as `approve`. */
  actions?: readonly string[];
}
