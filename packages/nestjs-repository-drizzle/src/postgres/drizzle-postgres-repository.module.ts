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
 * and on node-postgres, Neon serverless or Vercel Postgres a pool: Drizzle
 * runs every transaction on a single client's one connection.
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
  if (isSinglePgConnection(db)) {
    throw new DrizzleSingleConnectionException(connection);
  }
  return db;
}

/**
 * The Drizzle databases that run a transaction on their client's own
 * connection unless that client is a pool: node-postgres, Neon serverless
 * and Vercel Postgres.
 */
const POOLED_DATABASE_KINDS = [
  'NodePgDatabase',
  'NeonServerlessDatabase',
  'VercelPgDatabase',
];

/**
 * A database of one of `POOLED_DATABASE_KINDS` on a single client rather
 * than a pool, told by the class name of the client or one it extends, as
 * an `instanceof Pool` would. Read without importing the clients, which
 * other Postgres databases don't need.
 */
function isSinglePgConnection(db: DrizzlePostgresClient): boolean {
  const kind: unknown = Reflect.get(db.constructor, entityKind);
  if (typeof kind !== 'string' || !POOLED_DATABASE_KINDS.includes(kind)) {
    return false;
  }
  const client: unknown = Reflect.get(db, '$client');
  if (typeof client !== 'object' || client === null) return false;
  // A class whose name, or whose ancestors' name, says Pool: what
  // `instanceof Pool` finds, without node-postgres.
  for (
    let proto: unknown = Object.getPrototypeOf(client);
    typeof proto === 'object' && proto !== null;
    proto = Object.getPrototypeOf(proto)
  ) {
    if (proto.constructor.name.includes('Pool')) return false;
  }
  return true;
}

/** The Postgres adapter's definition, for the shared registration. */
export const DRIZZLE_POSTGRES_ADAPTER: DrizzleAdapterDefinitionInterface<
  DrizzlePostgresClient,
  DrizzlePostgresDriverOptionsInterface
> = {
  module: DrizzlePostgresRepositoryModule,
  transactionKeyPrefix: DRIZZLE_POSTGRES_TRANSACTION_KEY_PREFIX,
  toClient: toDrizzlePostgresClient,
  createRepository: (options) => new DrizzlePostgresRepository(options),
  createTransactionFactory: (db, connection, driverOptions) =>
    new DrizzlePostgresTransactionFactory(
      db,
      connection,
      driverOptions?.transactionSettings,
    ),
};
