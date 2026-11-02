import { type DataSource } from 'typeorm';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';

import { TypeOrmSqliteTransaction } from './typeorm-sqlite-transaction.js';

/**
 * Creates transactions on a SQLite data source. The data source has one
 * connection, so a second transaction cannot begin while one is open, and
 * transactions are run one at a time.
 */
export class TypeOrmSqliteTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = false;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name
   */
  constructor(dataSource: DataSource, dataSourceKey: string) {
    super(dataSource, dataSourceKey);
  }

  create(): TypeOrmSqliteTransaction {
    return new TypeOrmSqliteTransaction(this.dataSource);
  }
}
