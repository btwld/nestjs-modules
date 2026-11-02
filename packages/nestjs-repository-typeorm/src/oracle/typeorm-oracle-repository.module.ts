import { Module } from '@nestjs/common';

import { type DynamicRepositoryModule } from '@concepta/nestjs-repository';

import { type TypeOrmProviderOptionsInterface } from '../repository/typeorm-provider-options.interface.js';
import { type TypeOrmAdapterDefinitionInterface } from '../typeorm-adapter-definition.interface.js';
import { registerTypeOrmAdapter } from '../typeorm-repository.util.js';

import { TypeOrmOracleRepository } from './typeorm-oracle-repository.js';
import { TypeOrmOracleTransactionFactory } from './typeorm-oracle-transaction.factory.js';
import { TYPEORM_ORACLE_TRANSACTION_KEY_PREFIX } from './typeorm-oracle.constants.js';

/**
 * The TypeORM repository driver for Oracle, registered through
 * `RepositoryModule.forRoot()`. Refuses a data source of any other database.
 *
 * @example
 * ```typescript
 * RepositoryModule.forRoot({
 *   drivers: [
 *     {
 *       driver: TypeOrmOracleRepositoryModule,
 *       entities: [{ key: 'orders', entity: Order }],
 *     },
 *   ],
 * });
 * ```
 */
@Module({})
export class TypeOrmOracleRepositoryModule {
  /**
   * Build the repository providers for TypeORM entities. Called by
   * `RepositoryModule.forRoot()`, which binds and checks what it returns.
   */
  static register(
    entities: TypeOrmProviderOptionsInterface[],
  ): DynamicRepositoryModule {
    return registerTypeOrmAdapter(TYPEORM_ORACLE_ADAPTER, entities);
  }
}

export const TYPEORM_ORACLE_ADAPTER: TypeOrmAdapterDefinitionInterface = {
  module: TypeOrmOracleRepositoryModule,
  transactionKeyPrefix: TYPEORM_ORACLE_TRANSACTION_KEY_PREFIX,
  createRepository: (repo, options) =>
    new TypeOrmOracleRepository(repo, options),
  createTransactionFactory: (dataSource, dataSourceKey) =>
    new TypeOrmOracleTransactionFactory(dataSource, dataSourceKey),
};
