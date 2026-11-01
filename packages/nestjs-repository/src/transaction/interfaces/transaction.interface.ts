/**
 * A single transaction - manages lifecycle for one driver/datasource/run scope
 */
export interface TransactionInterface {
  readonly isActive: boolean;
  start(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /**
   * The driver's client for this transaction. A driver's own transaction
   * may declare its client type; callers holding this interface narrow it
   * to that transaction first.
   */
  getClient(): unknown;
}
