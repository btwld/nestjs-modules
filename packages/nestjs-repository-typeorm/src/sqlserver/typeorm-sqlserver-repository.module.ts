import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from '../repository/typeorm-provider-options.interface.js';
import { type TypeOrmAdapterDefinitionInterface } from '../typeorm-adapter-definition.interface.js';
import { registerTypeOrmAdapter } from '../typeorm-repository.util.js';

import { TypeOrmSqlServerRepository } from './typeorm-sqlserver-repository.js';
import { TypeOrmSqlServerTransactionFactory } from './typeorm-sqlserver-transaction.factory.js';
import { TYPEORM_SQLSERVER_TRANSACTION_KEY_PREFIX } from './typeorm-sqlserver.constants.js';

/**
 * The TypeORM repository driver for SQL Server, registered through
 * `RepositoryModule.forRoot()`. Refuses a data source of any other database.
 *
 * @example
 * ```typescript
 * RepositoryModule.forRoot({
 *   drivers: [
 *     {
 *       driver: TypeOrmSqlServerRepositoryModule,
 *       entities: [{ key: 'orders', entity: Order }],
 *     },
 *   ],
 * });
 * ```
 */
@Module({})
export class TypeOrmSqlServerRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerTypeOrmAdapter(TYPEORM_SQLSERVER_ADAPTER, entities);
  }
}

export const TYPEORM_SQLSERVER_ADAPTER: TypeOrmAdapterDefinitionInterface = {
  module: TypeOrmSqlServerRepositoryModule,
  transactionKeyPrefix: TYPEORM_SQLSERVER_TRANSACTION_KEY_PREFIX,
  createRepository: (repo, options) =>
    new TypeOrmSqlServerRepository(repo, options),
  createTransactionFactory: (dataSource, dataSourceKey) =>
    new TypeOrmSqlServerTransactionFactory(dataSource, dataSourceKey),
};
