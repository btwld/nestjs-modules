import { type PlainLiteralObject, type Provider } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';

import { HookResolverService } from '@concepta/nestjs-core';
import {
  type DynamicRepositoryModule,
  getDynamicRepositoryToken,
  type TransactionFactoryDescriptor,
} from '@concepta/nestjs-repository';

import { type DrizzleAdapterDefinitionInterface } from './drizzle-adapter-definition.interface.js';
import { DRIZZLE_DEFAULT_CONNECTION_NAME } from './drizzle-repository.constants.js';
import { buildMetadata } from './repository/drizzle-metadata.js';
import { type DrizzleProviderOptionsInterface } from './repository/drizzle-provider-options.interface.js';

/** The connection an entity names, or the default one. */
function resolveConnectionName(connection?: string): string {
  return connection ?? DRIZZLE_DEFAULT_CONNECTION_NAME;
}

/** The key of a connection's transactions, under the adapter's prefix. */
function resolveTransactionKey(prefix: string, connection?: string): string {
  return `${prefix}:${resolveConnectionName(connection)}`;
}

/**
 * A provider for one entity's repository, built from the database of its
 * connection.
 */
function createDrizzleProvider<
  Client,
  Options,
  Entity extends PlainLiteralObject,
>(
  definition: DrizzleAdapterDefinitionInterface<Client, Options>,
  options: DrizzleProviderOptionsInterface<Entity>,
  driverOptions?: Options,
): Provider {
  const connection = resolveConnectionName(options.connection);

  return {
    provide: getDynamicRepositoryToken(options.key),
    inject: [
      getDrizzleToken(connection),
      { token: HookResolverService, optional: true },
    ],
    useFactory: (db: unknown, hookResolver?: HookResolverService) =>
      definition.createRepository<Entity>(
        {
          entityKey: options.key,
          connection,
          db: definition.toClient(db, connection),
          table: options.table,
          metadata: buildMetadata(options, connection),
          transactionKey: resolveTransactionKey(
            definition.transactionKeyPrefix,
            connection,
          ),
          hookResolver,
        },
        driverOptions,
      ),
  };
}

/** The transaction factory of one connection. */
function createTransactionFactoryDescriptor<Client, Options>(
  definition: DrizzleAdapterDefinitionInterface<Client, Options>,
  connection: string,
  driverOptions?: Options,
): TransactionFactoryDescriptor {
  return {
    key: resolveTransactionKey(definition.transactionKeyPrefix, connection),
    inject: [getDrizzleToken(connection)],
    useFactory: (db: unknown) =>
      definition.createTransactionFactory(
        definition.toClient(db, connection),
        connection,
        driverOptions,
      ),
  };
}

/**
 * Build one adapter's registration for `RepositoryModule.forRoot()`: a
 * repository provider per entity and a transaction factory per connection.
 *
 * @param definition - The adapter
 * @param entities - Its entities
 * @param driverOptions - The registration's `options`, for the adapter
 */
export function registerDrizzleAdapter<Client, Options>(
  definition: DrizzleAdapterDefinitionInterface<Client, Options>,
  entities: DrizzleProviderOptionsInterface[],
  driverOptions?: Options,
): DynamicRepositoryModule {
  const connections = new Set(
    entities.map(({ connection }) => resolveConnectionName(connection)),
  );

  return {
    module: definition.module,
    providers: entities.map((entity) =>
      createDrizzleProvider(definition, entity, driverOptions),
    ),
    transactionFactories: Array.from(connections).map((connection) =>
      createTransactionFactoryDescriptor(definition, connection, driverOptions),
    ),
  };
}
