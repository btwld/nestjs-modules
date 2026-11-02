import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from '../repository/typeorm-provider-options.interface.js';
import { type TypeOrmAdapterDefinitionInterface } from '../typeorm-adapter-definition.interface.js';
import { registerTypeOrmAdapter } from '../typeorm-repository.util.js';

import { TypeOrmMysqlRepository } from './typeorm-mysql-repository.js';
import { TypeOrmMysqlTransactionFactory } from './typeorm-mysql-transaction.factory.js';
import { TYPEORM_MYSQL_TRANSACTION_KEY_PREFIX } from './typeorm-mysql.constants.js';

/**
 * The TypeORM repository driver for MySQL, registered through
 * `RepositoryModule.forRoot()`. Refuses a data source of any other
 * database, MariaDB included.
 *
 * @example
 * ```typescript
 * RepositoryModule.forRoot({
 *   drivers: [
 *     {
 *       driver: TypeOrmMysqlRepositoryModule,
 *       entities: [{ key: 'orders', entity: Order }],
 *     },
 *   ],
 * });
 * ```
 */
@Module({})
export class TypeOrmMysqlRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerTypeOrmAdapter(TYPEORM_MYSQL_ADAPTER, entities);
  }
}

export const TYPEORM_MYSQL_ADAPTER: TypeOrmAdapterDefinitionInterface = {
  module: TypeOrmMysqlRepositoryModule,
  transactionKeyPrefix: TYPEORM_MYSQL_TRANSACTION_KEY_PREFIX,
  createRepository: (repo, options) =>
    new TypeOrmMysqlRepository(repo, options),
  createTransactionFactory: (dataSource, dataSourceKey) =>
    new TypeOrmMysqlTransactionFactory(dataSource, dataSourceKey),
};
