import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type DrizzleAdapterDefinitionInterface } from '../drizzle-adapter-definition.interface.js';
import { registerDrizzleAdapter } from '../drizzle-repository.util.js';
import { toDrizzleMysqlClient } from '../mysql/drizzle-mysql-repository.module.js';
import { DrizzleMysqlTransactionFactory } from '../mysql/drizzle-mysql-transaction.factory.js';
import { type DrizzleMysqlClient } from '../mysql/drizzle-mysql.types.js';
import { type DrizzleProviderOptionsInterface } from '../repository/drizzle-provider-options.interface.js';

import { DrizzleMariadbRepository } from './drizzle-mariadb-repository.js';
import {
  DRIZZLE_MARIADB_DATABASE,
  DRIZZLE_MARIADB_TRANSACTION_KEY_PREFIX,
} from './drizzle-mariadb.constants.js';

/**
 * The Drizzle repository driver for MariaDB, registered through
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
 *           driver: DrizzleMariadbRepositoryModule,
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
export class DrizzleMariadbRepositoryModule {
  /**
   * Build the repository providers for Drizzle entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: DrizzleProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerDrizzleAdapter(DRIZZLE_MARIADB_ADAPTER, entities);
  }
}

/**
 * The MariaDB adapter's definition: the MySQL adapter's client and
 * transactions under its own keys. It trusts the registration, and does
 * not ask the server whether it is MariaDB.
 */
export const DRIZZLE_MARIADB_ADAPTER: DrizzleAdapterDefinitionInterface<DrizzleMysqlClient> =
  {
    module: DrizzleMariadbRepositoryModule,
    transactionKeyPrefix: DRIZZLE_MARIADB_TRANSACTION_KEY_PREFIX,
    toClient: (db, connection) =>
      toDrizzleMysqlClient(db, connection, DRIZZLE_MARIADB_DATABASE),
    createRepository: (options) => new DrizzleMariadbRepository(options),
    createTransactionFactory: (db) =>
      new DrizzleMysqlTransactionFactory(db, DRIZZLE_MARIADB_DATABASE),
  };
