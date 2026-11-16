/**
 * Record every write to an entity in an activity store.
 */
export interface ActivityRegistration {
  /**
   * The `forRoot()` key of the store the records go to: an append-only entity
   * with every column of `ActivityInterface`.
   */
  store: string;

  /** Record the new value of each changed column, not only its name. */
  values?: boolean;

  /** Columns whose values are never recorded. Only with `values`. */
  omit?: string[];
}
