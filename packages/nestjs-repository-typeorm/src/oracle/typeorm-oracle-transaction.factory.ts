import { type DataSource } from 'typeorm';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';

import { TypeOrmOracleTransaction } from './typeorm-oracle-transaction.js';

/**
 * Creates transactions on an Oracle data source. Transactions run
 * concurrently, each on its own connection.
 */
export class TypeOrmOracleTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = true;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name
   */
  constructor(dataSource: DataSource, dataSourceKey: string) {
    super(dataSource, dataSourceKey);
  }

  create(): TypeOrmOracleTransaction {
    return new TypeOrmOracleTransaction(this.dataSource);
  }
}
