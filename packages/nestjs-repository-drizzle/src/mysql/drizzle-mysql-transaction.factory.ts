import {
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

import { DrizzleMysqlTransaction } from './drizzle-mysql-transaction.js';
import { type DrizzleMysqlClient } from './drizzle-mysql.types.js';

/**
 * Creates the transactions of one `@nestjs/drizzle` MySQL connection.
 */
export class DrizzleMysqlTransactionFactory implements TransactionFactoryInterface {
  constructor(private readonly db: DrizzleMysqlClient) {}

  create(): TransactionInterface {
    return new DrizzleMysqlTransaction(this.db);
  }
}
