import {
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

import { DrizzleSqliteTransaction } from './drizzle-sqlite-transaction.js';
import { type DrizzleSqliteClient } from './drizzle-sqlite.types.js';

/**
 * Creates the transactions of one `@nestjs/drizzle` SQLite connection. The
 * connection is the database's only one, so a second transaction cannot
 * begin while one is open, and transactions are run one at a time.
 */
export class DrizzleSqliteTransactionFactory implements TransactionFactoryInterface {
  readonly supportsConcurrentTransactions = false;

  constructor(private readonly db: DrizzleSqliteClient) {}

  create(): TransactionInterface {
    return new DrizzleSqliteTransaction(this.db);
  }
}
