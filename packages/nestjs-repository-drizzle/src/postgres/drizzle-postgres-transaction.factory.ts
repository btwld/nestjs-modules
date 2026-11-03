import {
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

import { DrizzlePostgresTransaction } from './drizzle-postgres-transaction.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

/**
 * Creates the transactions of one `@nestjs/drizzle` Postgres connection.
 */
export class DrizzlePostgresTransactionFactory implements TransactionFactoryInterface {
  constructor(private readonly db: DrizzlePostgresClient) {}

  create(): TransactionInterface {
    return new DrizzlePostgresTransaction(this.db);
  }
}
