/**
 * The actor may take the action.
 */
export interface AuthorityAllowInterface {
  effect: 'allow';
  /**
   * The columns the action may touch. Absent means every column.
   */
  columns?: readonly string[];
}
