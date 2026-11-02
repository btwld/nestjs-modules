import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { TypeOrmMysqlTransactionFactory } from '../mysql/typeorm-mysql-transaction.factory.js';
import { type TypeOrmProviderOptionsInterface } from '../repository/typeorm-provider-options.interface.js';
import { type TypeOrmAdapterDefinitionInterface } from '../typeorm-adapter-definition.interface.js';
import { registerTypeOrmAdapter } from '../typeorm-repository.util.js';

import { TypeOrmMariadbRepository } from './typeorm-mariadb-repository.js';
import { TYPEORM_MARIADB_TRANSACTION_KEY_PREFIX } from './typeorm-mariadb.constants.js';

/**
 * The TypeORM repository driver for MariaDB, registered through
 * `RepositoryModule.forRoot()`. Refuses a data source of any other
 * database, MySQL included.
 *
 * @example
 * ```typescript
 * RepositoryModule.forRoot({
 *   drivers: [
 *     {
 *       driver: TypeOrmMariadbRepositoryModule,
 *       entities: [{ key: 'orders', entity: Order }],
 *     },
 *   ],
 * });
 * ```
 */
@Module({})
export class TypeOrmMariadbRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerTypeOrmAdapter(TYPEORM_MARIADB_ADAPTER, entities);
  }
}

export const TYPEORM_MARIADB_ADAPTER: TypeOrmAdapterDefinitionInterface = {
  module: TypeOrmMariadbRepositoryModule,
  transactionKeyPrefix: TYPEORM_MARIADB_TRANSACTION_KEY_PREFIX,
  createRepository: (repo, options) =>
    new TypeOrmMariadbRepository(repo, options),
  createTransactionFactory: (dataSource, dataSourceKey) =>
    new TypeOrmMysqlTransactionFactory(dataSource, dataSourceKey),
};
