import { type DataSource } from 'typeorm';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';

import { TypeOrmSqlServerTransaction } from './typeorm-sqlserver-transaction.js';

/**
 * Creates transactions on a SQL Server data source. Transactions run
 * concurrently, each on its own connection.
 */
export class TypeOrmSqlServerTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = true;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name
   */
  constructor(dataSource: DataSource, dataSourceKey: string) {
    super(dataSource, dataSourceKey);
  }

  create(): TypeOrmSqlServerTransaction {
    return new TypeOrmSqlServerTransaction(this.dataSource);
  }
}
