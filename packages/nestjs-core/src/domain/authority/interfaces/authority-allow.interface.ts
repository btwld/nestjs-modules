/**
 * The actor may take the action.
 */
export interface AuthorityAllowInterface<Column extends string = string> {
  effect: 'allow';
  /**
   * The columns the action may touch. Absent means every column.
   */
  columns?: readonly Column[];
}
