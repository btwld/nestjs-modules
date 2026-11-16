import { type DataSource, QueryFailedError } from 'typeorm';

import { type AppContextHost } from '@concepta/nestjs-core';
import {
  type RepositoryDatabaseErrorInterface,
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

import { describeQueryFailure } from '../typeorm-repository.util.js';

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

  /**
   * A commit the database refused: a failed query whose error the database
   * server sent, as `describeQueryFailure` reports it. Any other error, such
   * as a lost connection or a client timeout, leaves the commit's outcome
   * unknown, and is not described.
   */
  describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    return error instanceof QueryFailedError &&
      this.sentByServer(error.driverError)
      ? describeQueryFailure(error, this.dataSource)
      : undefined;
  }

  /**
   * Whether the database server sent `error`, the client's own error under a
   * failed query. The default tells none apart.
   */
  protected sentByServer(_error: Error): boolean {
    return false;
  }
}
