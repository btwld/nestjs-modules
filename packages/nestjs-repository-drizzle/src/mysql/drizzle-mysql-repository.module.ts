import { is } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';

import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type DrizzleAdapterDefinitionInterface } from '../drizzle-adapter-definition.interface.js';
import { registerDrizzleAdapter } from '../drizzle-repository.util.js';
import { DrizzleSingleConnectionException } from '../exceptions/drizzle-single-connection.exception.js';
import { DrizzleUnsupportedDatabaseException } from '../exceptions/drizzle-unsupported-database.exception.js';
import { type DrizzleProviderOptionsInterface } from '../repository/drizzle-provider-options.interface.js';

import { DrizzleMysqlRepository } from './drizzle-mysql-repository.js';
import { DrizzleMysqlTransactionFactory } from './drizzle-mysql-transaction.factory.js';
import {
  DRIZZLE_MYSQL_DATABASE,
  DRIZZLE_MYSQL_TRANSACTION_KEY_PREFIX,
} from './drizzle-mysql.constants.js';
import { type DrizzleMysqlClient } from './drizzle-mysql.types.js';

/**
 * The Drizzle repository driver for MySQL, registered through
 * `RepositoryModule.forRoot()`. Reads each connection's database from
 * `@nestjs/drizzle`, and refuses a connection that is not a mysql2 one.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     DrizzleModule.forRoot({ drizzle, connection }),
 *     RepositoryModule.forRoot({
 *       drivers: [
 *         {
 *           driver: DrizzleMysqlRepositoryModule,
 *           entities: [
 *             { key: 'books', entity: Book, table: books, removeDate: 'removedAt' },
 *           ],
 *         },
 *       ],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class DrizzleMysqlRepositoryModule {
  /**
   * Build the repository providers for Drizzle entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: DrizzleProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerDrizzleAdapter(DRIZZLE_MYSQL_ADAPTER, entities);
  }
}

/**
 * The database `@nestjs/drizzle` registered, which must be a mysql2 one on
 * a pool: on a single connection, Drizzle runs every transaction on it.
 * A pool is told apart the way Drizzle's own transactions tell it apart.
 *
 * @param db - The database registered for the connection
 * @param connection - The `@nestjs/drizzle` connection
 * @param accepted - The database the adapter is for, as its refusal names it
 */
export function toDrizzleMysqlClient(
  db: unknown,
  connection: string,
  accepted: string = DRIZZLE_MYSQL_DATABASE,
): DrizzleMysqlClient {
  if (!is(db, MySql2Database)) {
    throw new DrizzleUnsupportedDatabaseException(connection, accepted);
  }
  const client: unknown = Reflect.get(db, '$client');
  if (
    typeof client === 'object' &&
    client !== null &&
    !('getConnection' in client)
  ) {
    throw new DrizzleSingleConnectionException(connection);
  }
  return db;
}

/** The MySQL adapter's definition, for the shared registration. */
export const DRIZZLE_MYSQL_ADAPTER: DrizzleAdapterDefinitionInterface<DrizzleMysqlClient> =
  {
    module: DrizzleMysqlRepositoryModule,
    transactionKeyPrefix: DRIZZLE_MYSQL_TRANSACTION_KEY_PREFIX,
    toClient: (db, connection) => toDrizzleMysqlClient(db, connection),
    createRepository: (options) => new DrizzleMysqlRepository(options),
    createTransactionFactory: (db) =>
      new DrizzleMysqlTransactionFactory(db, DRIZZLE_MYSQL_DATABASE),
  };
