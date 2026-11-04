/**
 * A single transaction - manages lifecycle for one driver/datasource/run scope
 */
export interface TransactionInterface {
  readonly isActive: boolean;
  start(): Promise<void>;
  /**
   * Commit the transaction. When the database refuses, the transaction is
   * over once this rejects: none of its writes are kept, and its
   * connection holds no open transaction.
   */
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /**
   * The driver's client for this transaction. A driver's own transaction
   * may declare its client type; callers holding this interface narrow it
   * to that transaction first.
   */
  getClient(): unknown;
}
