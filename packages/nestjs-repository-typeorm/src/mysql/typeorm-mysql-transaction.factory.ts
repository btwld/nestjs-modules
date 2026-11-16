import { type DataSource } from 'typeorm';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';

import { TypeOrmMysqlTransaction } from './typeorm-mysql-transaction.js';

/**
 * Creates transactions on a MySQL or MariaDB data source. Transactions run
 * concurrently, each on its own connection.
 */
export class TypeOrmMysqlTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = true;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name
   */
  constructor(dataSource: DataSource, dataSourceKey: string) {
    super(dataSource, dataSourceKey);
  }

  /** mysql2 gives an error the server sent its `sqlState`. */
  protected override sentByServer(error: Error): boolean {
    return 'sqlState' in error && typeof error.sqlState === 'string';
  }

  create(): TypeOrmMysqlTransaction {
    return new TypeOrmMysqlTransaction(this.dataSource);
  }
}
