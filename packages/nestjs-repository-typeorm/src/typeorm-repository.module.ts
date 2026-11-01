import { Module } from '@nestjs/common';

import { DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { TypeOrmTransactionSettingsUnsupportedException } from './exceptions/typeorm-transaction-settings-unsupported.exception.js';
import { TYPEORM_POSTGRES_ADAPTER } from './postgres/typeorm-postgres-repository.module.js';
import { TypeOrmProviderOptionsInterface } from './repository/typeorm-provider-options.interface.js';
import { TYPEORM_SQLITE_ADAPTER } from './sqlite/typeorm-sqlite-repository.module.js';
import { type TypeOrmAdapterDefinitionInterface } from './typeorm-adapter-definition.interface.js';
import { TypeOrmDriverOptionsInterface } from './typeorm-driver-options.interface.js';
import {
  dataSourceOf,
  registerTypeOrmAdapter,
} from './typeorm-repository.util.js';

/**
 * TypeORM repository driver for a Postgres or SQLite data source,
 * registered through `RepositoryModule.forRoot()`.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ ... }),
 *     RepositoryModule.forRoot({
 *       drivers: [
 *         {
 *           driver: TypeOrmRepositoryModule,
 *           entities: [
 *             { key: 'orders', entity: Order },
 *             { key: 'customers', entity: Customer, dataSource: 'secondary' },
 *             { key: 'audit', entity: AuditLog, factory: createAuditRepository },
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
export class TypeOrmRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   *
   * @param entities - Entity options
   * @param options - Driver options, from the registration's `options`
   * @returns Dynamic module with repository providers and transaction factory descriptors
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
    options?: TypeOrmDriverOptionsInterface,
  ): DynamicRepositoryModule {
    return registerTypeOrmAdapter(ADAPTER, entities, options);
  }
}

/** Hands each data source to the Postgres or SQLite adapter, by its type. */
const ADAPTER: TypeOrmAdapterDefinitionInterface<TypeOrmDriverOptionsInterface> =
  {
    module: TypeOrmRepositoryModule,
    transactionKeyPrefix: 'typeorm',
    createRepository: (repo, options) =>
      dataSourceOf(repo.manager).options.type === 'postgres'
        ? TYPEORM_POSTGRES_ADAPTER.createRepository(repo, options)
        : TYPEORM_SQLITE_ADAPTER.createRepository(repo, options),
    createTransactionFactory: (dataSource, dataSourceKey, options) => {
      if (dataSource.options.type === 'postgres') {
        return TYPEORM_POSTGRES_ADAPTER.createTransactionFactory(
          dataSource,
          dataSourceKey,
          options,
        );
      }
      if (options?.transactionSettings) {
        throw new TypeOrmTransactionSettingsUnsupportedException(
          dataSourceKey,
          dataSource.options.type,
        );
      }
      return TYPEORM_SQLITE_ADAPTER.createTransactionFactory(
        dataSource,
        dataSourceKey,
      );
    },
  };
