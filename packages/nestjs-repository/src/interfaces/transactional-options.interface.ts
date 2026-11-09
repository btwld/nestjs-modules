/**
 * Options for the `@Transactional` decorator
 */
export interface TransactionalOptions {
  /**
   * If true, transaction always rolls back (for read-only operations).
   * Defaults to false.
   */
  readOnly?: boolean;

  /**
   * Transaction timeout in milliseconds.
   * Defaults to the module's `defaultTimeout`.
   */
  timeout?: number;
}
