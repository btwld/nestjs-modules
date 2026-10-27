import { type AppContextHost } from '@concepta/nestjs-core';

import { type TransactionInterface } from '../transaction/interfaces/transaction.interface.js';

/**
 * Factory for creating transactions.
 * Each driver/datasource provides its own factory implementation.
 */
export interface TransactionFactoryInterface {
  /**
   * Create a transaction for a scope. `ctx` is the context the scope runs
   * under; read overlays from it, never define them.
   */
  create(ctx: AppContextHost): TransactionInterface;

  /**
   * Whether this factory's underlying connection can have more than one
   * transaction active on it at the same time. Omit or set `true` for a
   * pooled/multi-connection backend (e.g. Postgres, where each transaction
   * gets its own connection). Set `false` when the backend hands out one
   * shared connection per data source (e.g. SQLite, and other
   * single-connection databases) — a second
   * `BEGIN` on that connection while the first transaction is still open
   * fails at the driver level. `false` makes `TransactionManager` queue
   * transactions for this factory's key so the second one waits for the
   * first to settle instead of erroring.
   */
  readonly supportsConcurrentTransactions?: boolean;
}
