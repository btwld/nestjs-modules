import {
  type DataSource,
  type DataSourceOptions,
  type EntitySchema,
  type Repository,
} from 'typeorm';

import {
  type DynamicModule,
  type PlainLiteralObject,
  type Provider,
  type Type,
} from '@nestjs/common';
import {
  getDataSourceToken,
  getRepositoryToken,
  TypeOrmModule,
} from '@nestjs/typeorm';

import { HookResolverService } from '@concepta/nestjs-core';
import {
  type DynamicRepositoryModule,
  getDynamicRepositoryToken,
  type TransactionFactoryDescriptor,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from './repository/typeorm-provider-options.interface.js';
import { type TypeOrmRepository } from './repository/typeorm-repository.js';
import { type TypeOrmAdapterDefinitionInterface } from './typeorm-adapter-definition.interface.js';
import { TYPEORM_DEFAULT_DATA_SOURCE_NAME } from './typeorm-repository.constants.js';
import { type TypeOrmDataSourceToken } from './typeorm-repository.types.js';

// `@nestjs/typeorm` uses this type internally (e.g. `getRepositoryToken`'s
// parameter) but does not export it from its public entry point, and its
// `exports` map forbids reaching into `dist/interfaces/` directly — that
// deep import only worked here because of a stale incremental tsc cache, not
// because it's a supported path. Redefined locally, matching the upstream
// `Function | EntitySchema` shape but with the constructor half narrowed to
// `Type<unknown>` (Nest's own class-constructor type) instead of the bare
// `Function` upstream uses.
type EntityClassOrSchema = Type<unknown> | EntitySchema;

/**
 * Read the data source name off a DataSource or its options.
 *
 * TypeORM 1.x dropped `name` from both, along with the named-connection
 * concept; 0.3 still declares and populates it. Read at runtime for the same
 * reason `@nestjs/typeorm` does, so the name agrees with the token Nest
 * registered.
 */
function readDataSourceName(
  dataSource: DataSource | DataSourceOptions,
): string | undefined {
  return 'name' in dataSource && typeof dataSource.name === 'string'
    ? dataSource.name
    : undefined;
}

/**
 * The data source behind an entity manager: `dataSource` in TypeORM 1.x,
 * `connection` in 0.3.
 */
export function dataSourceOf(
  manager:
    { readonly dataSource: DataSource } | { readonly connection: DataSource },
): DataSource {
  return 'dataSource' in manager ? manager.dataSource : manager.connection;
}

/**
 * Resolve data source name from token.
 */
export function resolveDataSourceName(
  dataSource?: TypeOrmDataSourceToken,
): string {
  if (!dataSource) {
    return TYPEORM_DEFAULT_DATA_SOURCE_NAME;
  }
  return typeof dataSource === 'string'
    ? dataSource
    : (readDataSourceName(dataSource) ?? TYPEORM_DEFAULT_DATA_SOURCE_NAME);
}

/**
 * Resolve transaction key for a data source.
 *
 * @param dataSource - The data source, or its name
 * @param prefix - The adapter's transaction key prefix
 */
export function resolveTransactionKey(
  dataSource?: TypeOrmDataSourceToken,
  prefix = 'typeorm',
): string {
  return `${prefix}:${resolveDataSourceName(dataSource)}`;
}

/**
 * Resolve TypeORM token name from data source name.
 */
export function resolveTokenName(dsName?: string): string | undefined {
  return dsName === TYPEORM_DEFAULT_DATA_SOURCE_NAME ? undefined : dsName;
}

/**
 * Create an adapter's repository.
 */
export function createTypeOrmRepository<E extends PlainLiteralObject, Options>(
  definition: TypeOrmAdapterDefinitionInterface<Options>,
  repo: Repository<E>,
  entityKey: string,
  dataSource?: string,
  hookResolver?: HookResolverService,
  transactionScope?: TransactionScope,
): TypeOrmRepository<E> {
  return definition.createRepository(repo, {
    entityKey,
    transactionKey: resolveTransactionKey(
      dataSource,
      definition.transactionKeyPrefix,
    ),
    dataSourceName: resolveDataSourceName(dataSource),
    hookResolver,
    transactionScope,
  });
}

/**
 * Injection token for optional HookResolverService.
 * Using this constant allows NestJS to inject undefined when HookResolverService is not available.
 */
export const OPTIONAL_HOOK_RESOLVER_INJECT = {
  token: HookResolverService,
  optional: true,
};

/**
 * Injection token for optional TransactionScope.
 * `RepositoryModule.forRoot()` provides it globally, but the driver's
 * providers still resolve without it, so the driver can be tested alone.
 */
export const OPTIONAL_TRANSACTION_SCOPE_INJECT = {
  token: TransactionScope,
  optional: true,
};

/**
 * Create a NestJS provider for an entity, built by an adapter.
 */
export function createTypeOrmProvider<E extends PlainLiteralObject, Options>(
  definition: TypeOrmAdapterDefinitionInterface<Options>,
  options: TypeOrmProviderOptionsInterface<E>,
): Provider {
  const { key, entity, dataSource, factory } = options;
  const dsName = resolveDataSourceName(dataSource);
  const dsToken = resolveTokenName(dsName);

  if (factory) {
    return {
      provide: getDynamicRepositoryToken(key),
      inject: [
        getDataSourceToken(dsToken),
        OPTIONAL_HOOK_RESOLVER_INJECT,
        OPTIONAL_TRANSACTION_SCOPE_INJECT,
      ],
      useFactory: (
        ds: DataSource,
        hookResolver?: HookResolverService,
        transactionScope?: TransactionScope,
      ) => {
        return createTypeOrmRepository(
          definition,
          factory(ds),
          key,
          dsName,
          hookResolver,
          transactionScope,
        );
      },
    };
  } else {
    return {
      provide: getDynamicRepositoryToken(key),
      inject: [
        getRepositoryToken(entity, dsToken),
        OPTIONAL_HOOK_RESOLVER_INJECT,
        OPTIONAL_TRANSACTION_SCOPE_INJECT,
      ],
      useFactory: (
        repo: Repository<E>,
        hookResolver?: HookResolverService,
        transactionScope?: TransactionScope,
      ) => {
        return createTypeOrmRepository(
          definition,
          repo,
          key,
          dsName,
          hookResolver,
          transactionScope,
        );
      },
    };
  }
}

/**
 * Get TypeORM module imports for entities.
 */
export function getTypeOrmImports(
  entities: readonly TypeOrmProviderOptionsInterface<PlainLiteralObject>[],
): DynamicModule[] {
  // Group entities by data source for TypeORM imports
  const entitiesByDataSource: Record<string, EntityClassOrSchema[]> = {};

  for (const entityOption of entities) {
    const dsName = resolveDataSourceName(entityOption.dataSource);

    if (!(dsName in entitiesByDataSource)) {
      entitiesByDataSource[dsName] = [];
    }

    entitiesByDataSource[dsName].push(entityOption.entity);
  }

  const imports: DynamicModule[] = [];

  for (const dsName in entitiesByDataSource) {
    imports.push(
      TypeOrmModule.forFeature(
        entitiesByDataSource[dsName],
        resolveTokenName(dsName),
      ),
    );
  }

  return imports;
}

/**
 * Create a transaction factory descriptor for a data source.
 * RepositoryModule handles the actual registration.
 *
 * @param definition - The adapter whose factory to build
 * @param dataSource - Optional data source name
 * @param options - The driver's options
 * @returns Transaction factory descriptor
 */
export function createTransactionFactoryDescriptor<Options>(
  definition: TypeOrmAdapterDefinitionInterface<Options>,
  dataSource?: string,
  options?: Options,
): TransactionFactoryDescriptor {
  const dsName = resolveDataSourceName(dataSource);
  const dsToken = resolveTokenName(dsName);

  return {
    key: resolveTransactionKey(dataSource, definition.transactionKeyPrefix),
    inject: [getDataSourceToken(dsToken)],
    useFactory: (ds: DataSource) =>
      definition.createTransactionFactory(ds, dsName, options),
  };
}

/**
 * Register an adapter's repositories: the TypeORM features they need, a
 * repository provider per entity, and a transaction factory per data
 * source. Each adapter module's `register()` delegates here.
 *
 * @param definition - The adapter
 * @param entities - Entity options
 * @param options - The driver's options
 */
export function registerTypeOrmAdapter<Options>(
  definition: TypeOrmAdapterDefinitionInterface<Options>,
  entities: TypeOrmProviderOptionsInterface[],
  options?: Options,
): DynamicRepositoryModule {
  const dataSourceNames = new Set(
    entities.map((entity) => resolveDataSourceName(entity.dataSource)),
  );

  return {
    module: definition.module,
    imports: getTypeOrmImports(entities),
    providers: entities.map((entity) =>
      createTypeOrmProvider(definition, entity),
    ),
    transactionFactories: Array.from(dataSourceNames).map((dsName) =>
      createTransactionFactoryDescriptor(definition, dsName, options),
    ),
  };
}
