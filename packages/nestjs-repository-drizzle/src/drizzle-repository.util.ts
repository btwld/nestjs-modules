import { is } from 'drizzle-orm';
import { PgAsyncDatabase } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject, type Provider } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';

import { HookResolverService, RuntimeException } from '@concepta/nestjs-core';
import { getDynamicRepositoryToken } from '@concepta/nestjs-repository';

import { DRIZZLE_DEFAULT_CONNECTION_NAME } from './drizzle-repository.constants.js';
import { type DrizzleClient } from './drizzle-repository.types.js';
import {
  buildMetadata,
  buildRelations,
} from './repository/drizzle-metadata.js';
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
 * an async Postgres one.
 */
export function toDrizzleClient(
  db: unknown,
  connection: string,
): DrizzleClient {
  if (!is(db, PgAsyncDatabase)) {
    throw new RuntimeException({
      message:
        'The Drizzle connection "%s" is not an async Postgres database, ' +
        'which is all the Drizzle repository driver supports',
      messageParams: [connection],
      fault: 'usage',
    });
  }
  return db;
}

/**
 * A provider for one entity's repository, built from the database of its
 * connection. `registered` is every entity this driver serves, so a relation
 * can name the entity registered for its target table.
 */
export function createDrizzleProvider<Entity extends PlainLiteralObject>(
  options: DrizzleProviderOptionsInterface<Entity>,
  registered: DrizzleProviderOptionsInterface[],
): Provider {
  const connection = resolveConnectionName(options.connection);
  const sameConnection = registered.filter(
    (entry) => resolveConnectionName(entry.connection) === connection,
  );

  return {
    provide: getDynamicRepositoryToken(options.key),
    inject: [
      getDrizzleToken(connection),
      { token: HookResolverService, optional: true },
    ],
    useFactory: (db: unknown, hookResolver?: HookResolverService) => {
      const client = toDrizzleClient(db, connection);
      const relations = buildRelations(
        options.table,
        client._.relations,
        sameConnection,
        connection,
      );
      return new DrizzleRepository<Entity>({
        entityKey: options.key,
        db: client,
        table: options.table,
        metadata: buildMetadata(options, relations, connection),
        relations,
        relationTypes: new Map(
          relations.flatMap(({ metadata, target }) => {
            const entry = sameConnection.find(({ table }) => table === target);
            return entry ? [[metadata.name, entry.entity]] : [];
          }),
        ),
        transactionKey: resolveTransactionKey(connection),
        hookResolver,
      });
    },
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
