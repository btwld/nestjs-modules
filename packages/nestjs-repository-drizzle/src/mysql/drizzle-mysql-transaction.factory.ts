import {
  type RepositoryDatabaseErrorInterface,
  type TransactionFactoryInterface,
  type TransactionInterface,
} from '@concepta/nestjs-repository';

import {
  describeQueryFailure,
  isDrizzleQueryError,
} from '../repository/drizzle-query-error.util.js';

import { DrizzleMysqlTransaction } from './drizzle-mysql-transaction.js';
import { type DrizzleMysqlClient } from './drizzle-mysql.types.js';

/**
 * Creates the transactions of one `@nestjs/drizzle` MySQL or MariaDB
 * connection.
 */
export class DrizzleMysqlTransactionFactory implements TransactionFactoryInterface {
  /**
   * @param db - The connection's database
   * @param database - The database it is, as errors report it
   */
  constructor(
    private readonly db: DrizzleMysqlClient,
    private readonly database: string,
  ) {}

  create(): TransactionInterface {
    return new DrizzleMysqlTransaction(this.db);
  }

  /**
   * A commit the database refused: an error the server sent, which mysql2
   * gives a `sqlState`. Any other error, such as a lost connection, leaves
   * the commit's outcome unknown, and is not described.
   */
  describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    const reported =
      isDrizzleQueryError(error) && error.cause instanceof Error
        ? error.cause
        : undefined;
    return reported &&
      'sqlState' in reported &&
      typeof reported.sqlState === 'string'
      ? describeQueryFailure(error, this.database)
      : undefined;
  }
}
