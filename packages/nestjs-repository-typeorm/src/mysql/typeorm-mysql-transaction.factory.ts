import { type DataSource } from 'typeorm';

import { TypeOrmTransactionFactory } from '../transaction/typeorm-transaction.factory.js';
import { TYPEORM_DEFAULT_DATA_SOURCE_NAME } from '../typeorm-repository.constants.js';

import { TypeOrmMysqlTransaction } from './typeorm-mysql-transaction.js';
import { TYPEORM_MYSQL_DATABASES } from './typeorm-mysql.constants.js';

/**
 * Creates transactions on a MySQL data source. Transactions run
 * concurrently, each on its own connection.
 */
export class TypeOrmMysqlTransactionFactory extends TypeOrmTransactionFactory {
  readonly supportsConcurrentTransactions = true;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name
   */
  constructor(
    dataSource: DataSource,
    dataSourceKey: string = TYPEORM_DEFAULT_DATA_SOURCE_NAME,
  ) {
    super(dataSource, dataSourceKey, TYPEORM_MYSQL_DATABASES);
  }

  create(): TypeOrmMysqlTransaction {
    return new TypeOrmMysqlTransaction(this.dataSource);
  }
}
