import {
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

import { type DrizzleClient } from '../drizzle-repository.types.js';

import { DrizzleTransaction } from './drizzle-transaction.js';

/**
 * Creates the transactions of one `@nestjs/drizzle` connection.
 */
export class DrizzleTransactionFactory implements TransactionFactoryInterface {
  constructor(private readonly db: DrizzleClient) {}

  create(): TransactionInterface {
    return new DrizzleTransaction(this.db);
  }
}
