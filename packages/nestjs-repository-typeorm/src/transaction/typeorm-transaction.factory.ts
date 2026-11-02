import { type DataSource } from 'typeorm';

import { type AppContextHost } from '@concepta/nestjs-core';
import {
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

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
   */
  protected constructor(
    protected readonly dataSource: DataSource,
    protected readonly dataSourceKey: string,
  ) {}

  /**
   * Create a new transaction bound to this factory's data source.
   */
  abstract create(ctx: AppContextHost): TransactionInterface;
}
