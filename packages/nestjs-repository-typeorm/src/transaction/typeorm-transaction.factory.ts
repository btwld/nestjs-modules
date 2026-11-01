import { type DataSource } from 'typeorm';

import { type AppContextHost } from '@concepta/nestjs-core';
import {
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

import { TypeOrmUnsupportedDatabaseException } from '../exceptions/typeorm-unsupported-database.exception.js';

/**
 * Factory for TypeORM transactions, shared by every database's adapter.
 *
 * Registered with the TransactionFactoryRegistry to enable automatic
 * transaction management via the `@Transactional()` decorator.
 */
export abstract class TypeOrmTransactionFactory implements TransactionFactoryInterface {
  abstract readonly supportsConcurrentTransactions: boolean;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name
   * @param databases - The database types the adapter accepts; a data
   *   source of any other is refused
   */
  protected constructor(
    protected readonly dataSource: DataSource,
    protected readonly dataSourceKey: string,
    databases: readonly string[],
  ) {
    if (!databases.includes(dataSource.options.type)) {
      throw new TypeOrmUnsupportedDatabaseException(
        `Data source "${dataSourceKey}"`,
        dataSource.options.type,
        databases,
      );
    }
  }

  /**
   * Create a new transaction bound to this factory's data source.
   */
  abstract create(ctx: AppContextHost): TransactionInterface;
}
