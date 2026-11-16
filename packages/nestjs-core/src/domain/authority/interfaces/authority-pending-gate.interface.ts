/**
 * One decision still pending, as `authorityPendingGates` lists it.
 */
export interface AuthorityPendingGateInterface {
  /** What closes the decision, as the rule's `pending` names it. */
  gate: string;
  /** The action held back. */
  action: string;
  /** The subject it is held back on. */
  subject: string;
  /** The fields held back; absent when the whole subject is. */
  fields?: string[];
}
