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
export function resolveConnectionName(connection?: string): string {
  return connection ?? DRIZZLE_DEFAULT_CONNECTION_NAME;
}

/** The key of a connection's transactions, under the adapter's prefix. */
export function resolveTransactionKey(
  prefix: string,
  connection?: string,
): string {
  return `${prefix}:${resolveConnectionName(connection)}`;
}

/**
 * A provider for one entity's repository, built from the database of its
 * connection.
 */
export function createDrizzleProvider<
  Client,
  Entity extends PlainLiteralObject,
>(
  definition: DrizzleAdapterDefinitionInterface<Client>,
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
      definition.createRepository<Entity>({
        entityKey: options.key,
        db: definition.toClient(db, connection),
        table: options.table,
        metadata: buildMetadata(options, connection),
        transactionKey: resolveTransactionKey(
          definition.transactionKeyPrefix,
          connection,
        ),
        hookResolver,
      }),
  };
}

/** The transaction factory of one connection. */
export function createTransactionFactoryDescriptor<Client>(
  definition: DrizzleAdapterDefinitionInterface<Client>,
  connection: string,
): TransactionFactoryDescriptor {
  return {
    key: resolveTransactionKey(definition.transactionKeyPrefix, connection),
    inject: [getDrizzleToken(connection)],
    useFactory: (db: unknown) =>
      definition.createTransactionFactory(definition.toClient(db, connection)),
  };
}

/**
 * Build one adapter's registration for `RepositoryModule.forRoot()`: a
 * repository provider per entity and a transaction factory per connection.
 */
export function registerDrizzleAdapter<Client>(
  definition: DrizzleAdapterDefinitionInterface<Client>,
  entities: DrizzleProviderOptionsInterface[],
): DynamicRepositoryModule {
  const connections = new Set(
    entities.map(({ connection }) => resolveConnectionName(connection)),
  );

  return {
    module: definition.module,
    providers: entities.map((entity) =>
      createDrizzleProvider(definition, entity),
    ),
    transactionFactories: Array.from(connections).map((connection) =>
      createTransactionFactoryDescriptor(definition, connection),
    ),
  };
}
