import { entityKind, is } from 'drizzle-orm';
import { PgDatabase } from 'drizzle-orm/pg-core';

import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type DrizzleAdapterDefinitionInterface } from '../drizzle-adapter-definition.interface.js';
import { registerDrizzleAdapter } from '../drizzle-repository.util.js';
import { DrizzleSingleConnectionException } from '../exceptions/drizzle-single-connection.exception.js';
import { DrizzleUnsupportedDatabaseException } from '../exceptions/drizzle-unsupported-database.exception.js';
import { type DrizzleProviderOptionsInterface } from '../repository/drizzle-provider-options.interface.js';

import { type DrizzlePostgresDriverOptionsInterface } from './drizzle-postgres-driver-options.interface.js';
import { DrizzlePostgresRepository } from './drizzle-postgres-repository.js';
import { DrizzlePostgresTransactionFactory } from './drizzle-postgres-transaction.factory.js';
import {
  DRIZZLE_POSTGRES_DATABASE,
  DRIZZLE_POSTGRES_TRANSACTION_KEY_PREFIX,
} from './drizzle-postgres.constants.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

/**
 * The Drizzle repository driver for Postgres, registered through
 * `RepositoryModule.forRoot()`. Reads each connection's database from
 * `@nestjs/drizzle`, and refuses a connection to any other database.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     DrizzleModule.forRoot({ drizzle, connection }),
 *     RepositoryModule.forRoot({
 *       drivers: [
 *         {
 *           driver: DrizzlePostgresRepositoryModule,
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
export class DrizzlePostgresRepositoryModule {
  /**
   * Build the repository providers for Drizzle entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: DrizzleProviderOptionsInterface[],
    options?: DrizzlePostgresDriverOptionsInterface,
  ): DynamicRepositoryModule {
    return registerDrizzleAdapter(DRIZZLE_POSTGRES_ADAPTER, entities, options);
  }
}

/**
 * The database `@nestjs/drizzle` registered, which must be a Postgres one,
 * and on node-postgres a pool: Drizzle runs every transaction on a single
 * `Client`'s one connection.
 */
export function toDrizzlePostgresClient(
  db: unknown,
  connection: string,
): DrizzlePostgresClient {
  if (!is(db, PgDatabase)) {
    throw new DrizzleUnsupportedDatabaseException(
      connection,
      DRIZZLE_POSTGRES_DATABASE,
    );
  }
  if (isSingleNodePgConnection(db)) {
    throw new DrizzleSingleConnectionException(connection);
  }
  return db;
}

/**
 * A node-postgres database on a `Client` rather than a pool, told apart the
 * way Drizzle's own transactions tell them apart. Read without importing
 * node-postgres, which other Postgres clients don't need.
 */
function isSingleNodePgConnection(db: DrizzlePostgresClient): boolean {
  if (Reflect.get(db.constructor, entityKind) !== 'NodePgDatabase') {
    return false;
  }
  const client: unknown = Reflect.get(db, '$client');
  return (
    typeof client === 'object' &&
    client !== null &&
    !client.constructor.name.includes('Pool')
  );
}

/** The Postgres adapter's definition, for the shared registration. */
export const DRIZZLE_POSTGRES_ADAPTER: DrizzleAdapterDefinitionInterface<
  DrizzlePostgresClient,
  DrizzlePostgresDriverOptionsInterface
> = {
  module: DrizzlePostgresRepositoryModule,
  transactionKeyPrefix: DRIZZLE_POSTGRES_TRANSACTION_KEY_PREFIX,
  toClient: toDrizzlePostgresClient,
  createRepository: (options, driverOptions) =>
    new DrizzlePostgresRepository(options, driverOptions?.transactionSettings),
  createTransactionFactory: (db, connection, driverOptions) =>
    new DrizzlePostgresTransactionFactory(
      db,
      connection,
      driverOptions?.transactionSettings,
    ),
};
