/**
 * An action on a subject no rule decides as a whole, as `authorityRuleGaps`
 * lists it.
 */
export interface AuthorityRuleGapInterface {
  /** The subject. */
  subject: string;
  /** The action. */
  action: string;
  /**
   * The fields rules name for it, when every rule naming the pair names
   * fields. A call naming fields gets only those; an allow among them
   * allows a call naming none, such as a delete or a domain operation,
   * outright. Absent when no rule names the pair, which is refused.
   */
  fields?: string[];
}
