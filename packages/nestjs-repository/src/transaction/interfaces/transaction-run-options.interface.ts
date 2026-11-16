/**
 * Options for `TransactionScope.run()`.
 */
export interface TransactionRunOptions {
  /**
   * Run the transaction read-only. Decided by the run that opens the scope:
   * a run joining it with a different value throws
   * `TransactionReadOnlyConflictException`.
   */
  readOnly?: boolean;

  /**
   * Milliseconds the run may take before it rejects with
   * `TransactionTimeoutException`. Defaults to the module's `defaultTimeout`.
   */
  timeout?: number;
}
