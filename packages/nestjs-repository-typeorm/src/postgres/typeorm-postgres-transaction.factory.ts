import { type DataSource } from 'typeorm';

import { type AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';

import { type TypeOrmPostgresTransactionSettingsResolver } from './typeorm-postgres-transaction-settings-resolver.type.js';
import { TypeOrmPostgresTransaction } from './typeorm-postgres-transaction.js';

/**
 * Creates transactions on a Postgres data source. Transactions run
 * concurrently, each on its own connection.
 */
export class TypeOrmPostgresTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = true;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name, as given to `transactionSettings`
   * @param transactionSettings - Settings applied at the start of every
   *   transaction
   */
  constructor(
    dataSource: DataSource,
    dataSourceKey: string,
    private readonly transactionSettings?: TypeOrmPostgresTransactionSettingsResolver,
  ) {
    super(dataSource, dataSourceKey);
  }

  /** node-postgres gives an error the server sent its `severity`. */
  protected override sentByServer(error: Error): boolean {
    return 'severity' in error && typeof error.severity === 'string';
  }

  create(ctx: AppContextHost): TypeOrmPostgresTransaction {
    return new TypeOrmPostgresTransaction(
      this.dataSource,
      this.transactionSettings?.(ctx, this.dataSourceKey),
    );
  }
}
