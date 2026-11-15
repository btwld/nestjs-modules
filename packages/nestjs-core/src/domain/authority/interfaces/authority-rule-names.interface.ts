/**
 * The names a rule set may use, for `authorityRuleProblems` to refuse any
 * other: a misspelled deny would otherwise deny nothing.
 */
export interface AuthorityRuleNamesInterface {
  /** Every subject a rule may name; when absent, any subject. */
  subjects?: Iterable<string>;
  /** Every action a rule may name; when absent, any verb. */
  actions?: Iterable<string>;
  /**
   * The fields of each subject it lists. A rule's every field must be one of
   * the fields of each of its subjects listed here; a subject not listed
   * here may have any field.
   */
  fields?: ReadonlyMap<string, Iterable<string>>;
}
