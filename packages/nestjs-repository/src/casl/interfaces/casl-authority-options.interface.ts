/**
 * What `CaslAuthority`'s rules may name besides the entities it governs and
 * the six actions a repository asks.
 */
export interface CaslAuthorityOptionsInterface {
  /**
   * Subjects it decides that are not entities, such as a route's resource
   * that access control asks it about. Access control decides one of them
   * by the authority even if its `except` lists it.
   */
  subjects?: readonly string[];
  /** Verbs of your own, such as `approve`. */
  actions?: readonly string[];
}
