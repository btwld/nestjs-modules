/**
 * The actor may take the action.
 */
export interface AuthorityAllowInterface<Column extends string = string> {
  effect: 'allow';
  /**
   * The columns the action may touch. Absent means every column.
   */
  columns?: readonly Column[];
  /**
   * For each column left out of `columns` because a decision is still
   * pending, the gate that closes it. A column left out for good has none.
   */
  gates?: Readonly<Partial<Record<Column, string>>>;
}
