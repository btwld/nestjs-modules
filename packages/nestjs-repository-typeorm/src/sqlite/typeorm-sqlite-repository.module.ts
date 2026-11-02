import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from '../repository/typeorm-provider-options.interface.js';
import { type TypeOrmAdapterDefinitionInterface } from '../typeorm-adapter-definition.interface.js';
import { registerTypeOrmAdapter } from '../typeorm-repository.util.js';

import { TypeOrmSqliteRepository } from './typeorm-sqlite-repository.js';
import { TypeOrmSqliteTransactionFactory } from './typeorm-sqlite-transaction.factory.js';
import { TYPEORM_SQLITE_TRANSACTION_KEY_PREFIX } from './typeorm-sqlite.constants.js';

/**
 * The TypeORM repository driver for SQLite (`better-sqlite3`), registered
 * through `RepositoryModule.forRoot()`. Refuses a data source of any other
 * database.
 *
 * @example
 * ```typescript
 * RepositoryModule.forRoot({
 *   drivers: [
 *     {
 *       driver: TypeOrmSqliteRepositoryModule,
 *       entities: [{ key: 'orders', entity: Order }],
 *     },
 *   ],
 * });
 * ```
 */
@Module({})
export class TypeOrmSqliteRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerTypeOrmAdapter(TYPEORM_SQLITE_ADAPTER, entities);
  }
}

export const TYPEORM_SQLITE_ADAPTER: TypeOrmAdapterDefinitionInterface = {
  module: TypeOrmSqliteRepositoryModule,
  transactionKeyPrefix: TYPEORM_SQLITE_TRANSACTION_KEY_PREFIX,
  createRepository: (repo, options) =>
    new TypeOrmSqliteRepository(repo, options),
  createTransactionFactory: (dataSource, dataSourceKey) =>
    new TypeOrmSqliteTransactionFactory(dataSource, dataSourceKey),
};
