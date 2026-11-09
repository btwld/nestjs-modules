import { type DataSource, type Repository } from 'typeorm';

import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type TypeOrmRepositoryOptions } from './repository/typeorm-repository-options.interface.js';
import { type TypeOrmRepository } from './repository/typeorm-repository.js';
import { type TypeOrmTransactionFactory } from './transaction/typeorm-transaction.factory.js';

/**
 * What one database's adapter gives the shared registration: its module
 * class, its transaction keys, and how to build its repositories and
 * transaction factories.
 */
export interface TypeOrmAdapterDefinitionInterface<Options = undefined> {
  /** The adapter's module class. */
  module: Type;

  /**
   * Prefixes each data source's transaction key, e.g. `'typeorm-postgres'`
   * for `'typeorm-postgres:default'`.
   */
  transactionKeyPrefix: string;

  /** Build the adapter's repository around a TypeORM repository. */
  createRepository<Entity extends PlainLiteralObject>(
    repo: Repository<Entity>,
    options: TypeOrmRepositoryOptions,
  ): TypeOrmRepository<Entity>;

  /** Build the adapter's transaction factory for one data source. */
  createTransactionFactory(
    dataSource: DataSource,
    dataSourceKey: string,
    options?: Options,
  ): TypeOrmTransactionFactory;
}
