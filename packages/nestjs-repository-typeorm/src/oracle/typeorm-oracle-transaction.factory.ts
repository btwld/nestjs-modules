import { type DataSource } from 'typeorm';

import { type AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';

import { type TypeOrmOracleApplicationContextInterface } from './typeorm-oracle-application-context.interface.js';
import { TypeOrmOracleTransaction } from './typeorm-oracle-transaction.js';

/**
 * Creates transactions on an Oracle data source. Transactions run
 * concurrently, each on its own connection.
 */
export class TypeOrmOracleTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = true;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name, as given to the application context's
   *   `values`
   * @param applicationContext - Values set for every transaction
   */
  constructor(
    dataSource: DataSource,
    dataSourceKey: string,
    private readonly applicationContext?: TypeOrmOracleApplicationContextInterface,
  ) {
    super(dataSource, dataSourceKey);
  }

  create(ctx: AppContextHost): TypeOrmOracleTransaction {
    return this.applicationContext
      ? new TypeOrmOracleTransaction(
          this.dataSource,
          this.applicationContext.procedure,
          this.applicationContext.values(ctx, this.dataSourceKey),
        )
      : new TypeOrmOracleTransaction(this.dataSource);
  }
}
