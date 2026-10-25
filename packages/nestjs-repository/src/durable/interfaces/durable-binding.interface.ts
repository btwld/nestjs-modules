import { type OutboxInboxStore, type OutboxStore } from '@nestjs/outbox';

/**
 * What a durable driver binds for one registration: the store its messages
 * and inbox records go to, and the key of the transaction that
 * registration's writes run in.
 */
export interface DurableBindingInterface {
  /**
   * The key `getOrStart()` takes for the registration's transaction, so a
   * message joins the same transaction as the writes beside it.
   */
  readonly transactionKey: string;

  /** Messages and inbox records, on the registration's own datasource. */
  readonly store: OutboxStore & OutboxInboxStore;
}
