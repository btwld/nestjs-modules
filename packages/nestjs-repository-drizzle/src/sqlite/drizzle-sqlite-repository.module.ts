import { is } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type DrizzleAdapterDefinitionInterface } from '../drizzle-adapter-definition.interface.js';
import { registerDrizzleAdapter } from '../drizzle-repository.util.js';
import { DrizzleUnsupportedDatabaseException } from '../exceptions/drizzle-unsupported-database.exception.js';
import { type DrizzleProviderOptionsInterface } from '../repository/drizzle-provider-options.interface.js';

import { DrizzleSqliteRepository } from './drizzle-sqlite-repository.js';
import { DrizzleSqliteTransactionFactory } from './drizzle-sqlite-transaction.factory.js';
import {
  DRIZZLE_SQLITE_DATABASE,
  DRIZZLE_SQLITE_TRANSACTION_KEY_PREFIX,
} from './drizzle-sqlite.constants.js';
import { type DrizzleSqliteClient } from './drizzle-sqlite.types.js';

/**
 * The Drizzle repository driver for SQLite, registered through
 * `RepositoryModule.forRoot()`. Reads each connection's database from
 * `@nestjs/drizzle`, and refuses a connection that is not a better-sqlite3
 * one.
 *
 * SQLite enforces foreign keys only on a connection that turns them on, and
 * the driver changes nothing about the connection: turn them on where the
 * connection is opened. Every call made while a run is open must carry the
 * run's context; see `DrizzleSqliteRepository`.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     DrizzleModule.forRootAsync({
 *       useFactory: () => {
 *         const db = drizzle('app.db');
 *         db.run(sql`pragma foreign_keys = on`);
 *         return { db };
 *       },
 *     }),
 *     RepositoryModule.forRoot({
 *       drivers: [
 *         {
 *           driver: DrizzleSqliteRepositoryModule,
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
export class DrizzleSqliteRepositoryModule {
  /**
   * Build the repository providers for Drizzle entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: DrizzleProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerDrizzleAdapter(DRIZZLE_SQLITE_ADAPTER, entities);
  }
}

/**
 * The database `@nestjs/drizzle` registered, which must be a better-sqlite3
 * one.
 *
 * @param db - The database registered for the connection
 * @param connection - The `@nestjs/drizzle` connection
 */
export function toDrizzleSqliteClient(
  db: unknown,
  connection: string,
): DrizzleSqliteClient {
  if (!is(db, BetterSQLite3Database)) {
    throw new DrizzleUnsupportedDatabaseException(
      connection,
      DRIZZLE_SQLITE_DATABASE,
    );
  }
  return db;
}

/** The SQLite adapter's definition, for the shared registration. */
export const DRIZZLE_SQLITE_ADAPTER: DrizzleAdapterDefinitionInterface<DrizzleSqliteClient> =
  {
    module: DrizzleSqliteRepositoryModule,
    transactionKeyPrefix: DRIZZLE_SQLITE_TRANSACTION_KEY_PREFIX,
    toClient: toDrizzleSqliteClient,
    createRepository: (options) => new DrizzleSqliteRepository(options),
    createTransactionFactory: (db) => new DrizzleSqliteTransactionFactory(db),
  };
