import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from '../repository/typeorm-provider-options.interface.js';
import { type TypeOrmAdapterDefinitionInterface } from '../typeorm-adapter-definition.interface.js';
import { registerTypeOrmAdapter } from '../typeorm-repository.util.js';

import { type TypeOrmPostgresDriverOptionsInterface } from './typeorm-postgres-driver-options.interface.js';
import { TypeOrmPostgresRepository } from './typeorm-postgres-repository.js';
import { TypeOrmPostgresTransactionFactory } from './typeorm-postgres-transaction.factory.js';
import { TYPEORM_POSTGRES_TRANSACTION_KEY_PREFIX } from './typeorm-postgres.constants.js';

/**
 * The TypeORM repository driver for Postgres, registered through
 * `RepositoryModule.forRoot()`. Refuses a data source of any other
 * database.
 *
 * @example
 * ```typescript
 * RepositoryModule.forRoot({
 *   drivers: [
 *     {
 *       driver: TypeOrmPostgresRepositoryModule,
 *       entities: [{ key: 'orders', entity: Order }],
 *     },
 *   ],
 * });
 * ```
 */
@Module({})
export class TypeOrmPostgresRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
    options?: TypeOrmPostgresDriverOptionsInterface,
  ): DynamicRepositoryModule {
    return registerTypeOrmAdapter(TYPEORM_POSTGRES_ADAPTER, entities, options);
  }
}

export const TYPEORM_POSTGRES_ADAPTER: TypeOrmAdapterDefinitionInterface<TypeOrmPostgresDriverOptionsInterface> =
  {
    module: TypeOrmPostgresRepositoryModule,
    transactionKeyPrefix: TYPEORM_POSTGRES_TRANSACTION_KEY_PREFIX,
    createRepository: (repo, options) =>
      new TypeOrmPostgresRepository(repo, options),
    createTransactionFactory: (dataSource, dataSourceKey, options) =>
      new TypeOrmPostgresTransactionFactory(
        dataSource,
        dataSourceKey,
        options?.transactionSettings,
      ),
  };
