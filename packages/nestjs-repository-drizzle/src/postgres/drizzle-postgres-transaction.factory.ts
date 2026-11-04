import { type AppContextHost } from '@concepta/nestjs-core';
import { type TransactionFactoryInterface } from '@concepta/nestjs-repository';

import { type DrizzlePostgresTransactionSettingsResolver } from './drizzle-postgres-transaction-settings-resolver.type.js';
import { DrizzlePostgresTransaction } from './drizzle-postgres-transaction.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

/**
 * Creates the transactions of one `@nestjs/drizzle` Postgres connection.
 */
export class DrizzlePostgresTransactionFactory implements TransactionFactoryInterface {
  /**
   * @param db - The connection's database
   * @param connection - Its name, as given to `transactionSettings`
   * @param transactionSettings - Settings applied at the start of every
   *   transaction
   */
  constructor(
    private readonly db: DrizzlePostgresClient,
    private readonly connection: string,
    private readonly transactionSettings?: DrizzlePostgresTransactionSettingsResolver,
  ) {}

  create(ctx: AppContextHost): DrizzlePostgresTransaction {
    return new DrizzlePostgresTransaction(
      this.db,
      this.transactionSettings?.(ctx, this.connection),
    );
  }
}
