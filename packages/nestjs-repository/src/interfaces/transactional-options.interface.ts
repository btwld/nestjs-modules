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
   * Defaults to 30000.
   */
  timeout?: number;
}
