/**
 * The actor may not take the action.
 */
export interface AuthorityRefuseInterface {
  effect: 'refuse';
  /**
   * What must be decided before the action can be allowed, when the refusal
   * is a decision still pending rather than a denial.
   */
  gate?: string;
}
