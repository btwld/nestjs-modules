import { type DataSource, type EntitySchema, type Repository } from 'typeorm';

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
  getDynamicRepositoryToken,
  type RelationActionConfig,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from './repository/typeorm-provider-options.interface.js';
import { TypeOrmRepository } from './repository/typeorm-repository.js';
import { TypeOrmTransactionFactory } from './transaction/typeorm-transaction.factory.js';
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
    : (dataSource.name ?? TYPEORM_DEFAULT_DATA_SOURCE_NAME);
}

/**
 * Resolve transaction key for a data source.
 */
export function resolveTransactionKey(
  dataSource?: TypeOrmDataSourceToken,
): string {
  return `typeorm:${resolveDataSourceName(dataSource)}`;
}

/**
 * Resolve TypeORM token name from data source name.
 */
export function resolveTokenName(dsName?: string): string | undefined {
  return dsName === TYPEORM_DEFAULT_DATA_SOURCE_NAME ? undefined : dsName;
}

/**
 * Create a TypeOrmRepository instance.
 */
export function createTypeOrmRepository<E extends PlainLiteralObject>(
  repo: Repository<E>,
  entityKey: string,
  dataSource?: string,
  hookResolver?: HookResolverService,
  relationsConfig?: Record<string, RelationActionConfig>,
  transactionScope?: TransactionScope,
): TypeOrmRepository<E> {
  return new TypeOrmRepository(repo, {
    entityKey,
    transactionKey: resolveTransactionKey(dataSource),
    hookResolver,
    relationsConfig,
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
 * `RepositoryModule.forRoot()` provides it globally, but repository
 * providers must still resolve cleanly for hand-wired/test usage that
 * doesn't import it.
 */
export const OPTIONAL_TRANSACTION_SCOPE_INJECT = {
  token: TransactionScope,
  optional: true,
};

/**
 * Create a NestJS provider for an entity.
 */
export function createTypeOrmProvider<E extends PlainLiteralObject>(
  options: TypeOrmProviderOptionsInterface<E>,
): Provider {
  const { key, entity, dataSource, factory, relations } = options;
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
          factory(ds),
          key,
          dsName,
          hookResolver,
          relations,
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
          repo,
          key,
          dsName,
          hookResolver,
          relations,
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
 * @param dataSource - Optional data source name
 * @returns Transaction factory descriptor
 */
export function createTransactionFactoryDescriptor(dataSource?: string): {
  key: string;
  inject: ReturnType<typeof getDataSourceToken>[];
  useFactory: (ds: DataSource) => TypeOrmTransactionFactory;
} {
  const dsName = resolveDataSourceName(dataSource);
  const dsToken = resolveTokenName(dsName);

  return {
    key: resolveTransactionKey(dataSource),
    inject: [getDataSourceToken(dsToken)],
    useFactory: (ds: DataSource) => new TypeOrmTransactionFactory(ds),
  };
}
