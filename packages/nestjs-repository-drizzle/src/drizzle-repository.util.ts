import { is } from 'drizzle-orm';
import { PgDatabase } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject, type Provider } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';

import { HookResolverService, RuntimeException } from '@concepta/nestjs-core';
import { getDynamicRepositoryToken } from '@concepta/nestjs-repository';

import { DRIZZLE_DEFAULT_CONNECTION_NAME } from './drizzle-repository.constants.js';
import { type DrizzleClient } from './drizzle-repository.types.js';
import { buildMetadata } from './repository/drizzle-metadata.js';
import { type DrizzleProviderOptionsInterface } from './repository/drizzle-provider-options.interface.js';
import { DrizzleRepository } from './repository/drizzle-repository.js';
import { DrizzleTransactionFactory } from './transaction/drizzle-transaction.factory.js';

/** The connection an entity names, or the default one. */
export function resolveConnectionName(connection?: string): string {
  return connection ?? DRIZZLE_DEFAULT_CONNECTION_NAME;
}

/** The key of a connection's transactions. */
export function resolveTransactionKey(connection?: string): string {
  return `drizzle:${resolveConnectionName(connection)}`;
}

/**
 * The database `@nestjs/drizzle` registered for a connection, which must be
 * a Postgres one.
 */
export function toDrizzleClient(
  db: unknown,
  connection: string,
): DrizzleClient {
  if (!is(db, PgDatabase)) {
    throw new RuntimeException({
      message:
        'The Drizzle connection "%s" is not a Postgres database, ' +
        'which is all the Drizzle repository driver supports',
      messageParams: [connection],
      fault: 'usage',
    });
  }
  return db;
}

/**
 * A provider for one entity's repository, built from the database of its
 * connection.
 */
export function createDrizzleProvider<Entity extends PlainLiteralObject>(
  options: DrizzleProviderOptionsInterface<Entity>,
): Provider {
  const connection = resolveConnectionName(options.connection);

  return {
    provide: getDynamicRepositoryToken(options.key),
    inject: [
      getDrizzleToken(connection),
      { token: HookResolverService, optional: true },
    ],
    useFactory: (db: unknown, hookResolver?: HookResolverService) =>
      new DrizzleRepository<Entity>({
        entityKey: options.key,
        db: toDrizzleClient(db, connection),
        table: options.table,
        metadata: buildMetadata(options, connection),
        transactionKey: resolveTransactionKey(connection),
        hookResolver,
      }),
  };
}

/** The transaction factory of one connection. */
export function createTransactionFactoryDescriptor(connection: string): {
  key: string;
  inject: string[];
  useFactory: (db: unknown) => DrizzleTransactionFactory;
} {
  return {
    key: resolveTransactionKey(connection),
    inject: [getDrizzleToken(connection)],
    useFactory: (db: unknown) =>
      new DrizzleTransactionFactory(toDrizzleClient(db, connection)),
  };
}
