import { type DataSource } from 'typeorm';

import { type AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';
import { TYPEORM_DEFAULT_DATA_SOURCE_NAME } from '../typeorm-repository.constants.js';

import { type TypeOrmTransactionSettingsResolver } from './typeorm-postgres-transaction-settings-resolver.type.js';
import { TypeOrmPostgresTransaction } from './typeorm-postgres-transaction.js';
import { TYPEORM_POSTGRES_DATABASES } from './typeorm-postgres.constants.js';

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
    dataSourceKey: string = TYPEORM_DEFAULT_DATA_SOURCE_NAME,
    private readonly transactionSettings?: TypeOrmTransactionSettingsResolver,
  ) {
    super(dataSource, dataSourceKey, TYPEORM_POSTGRES_DATABASES);
  }

  create(ctx: AppContextHost): TypeOrmPostgresTransaction {
    return new TypeOrmPostgresTransaction(
      this.dataSource,
      this.transactionSettings?.(ctx, this.dataSourceKey),
    );
  }
}
