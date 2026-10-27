import { type DatabaseType, DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { type AppContextHost } from '@concepta/nestjs-core';
import {
  TransactionInterface,
  TransactionFactoryInterface,
} from '@concepta/nestjs-repository';

import { TypeOrmTransactionSettingsUnsupportedException } from '../exceptions/typeorm-transaction-settings-unsupported.exception.js';
import { TYPEORM_DEFAULT_DATA_SOURCE_NAME } from '../typeorm-repository.constants.js';

import { type TypeOrmTransactionSettingsResolver } from './typeorm-transaction-settings-resolver.type.js';
import { TypeOrmTransaction } from './typeorm-transaction.js';

// Drivers whose createQueryRunner() returns one shared QueryRunner per
// DataSource rather than a fresh one per call. A second BEGIN on that shared
// connection while the first transaction is still open fails at the driver
// level (#476), so these need TransactionManager to serialize transactions.
// `postgres`, and everything else not listed, is unaffected.
//
// `mongodb` caches one too, but is excluded: its startTransaction() and
// commitTransaction() are no-ops, so there's no BEGIN to collide with.
//
// `sqlite` is the legacy sqlite3-backed driver, present in TypeORM 0.3 and
// removed from `DatabaseType` in 1.x. It stays in the element type so one
// build serves either line.
const SHARED_QUERY_RUNNER_DRIVER_TYPES: ReadonlySet<DatabaseType | 'sqlite'> =
  new Set<DatabaseType | 'sqlite'>([
    'sqlite',
    'better-sqlite3',
    'sqljs',
    'expo',
    'capacitor',
    'cordova',
    'nativescript',
    'react-native',
  ]);

/**
 * Factory for creating TypeORM transactions.
 *
 * Registered with the TransactionFactoryRegistry to enable automatic
 * transaction management via the `@Transactional()` decorator.
 */
@Injectable()
export class TypeOrmTransactionFactory implements TransactionFactoryInterface {
  readonly supportsConcurrentTransactions: boolean;

  /**
   * @param dataSource - The data source transactions run on
   * @param dataSourceKey - Its name, as given to `transactionSettings`
   * @param transactionSettings - Settings applied at the start of every
   *   transaction; Postgres only, refused for any other database
   */
  constructor(
    private readonly dataSource: DataSource,
    private readonly dataSourceKey: string = TYPEORM_DEFAULT_DATA_SOURCE_NAME,
    private readonly transactionSettings?: TypeOrmTransactionSettingsResolver,
  ) {
    this.supportsConcurrentTransactions = !SHARED_QUERY_RUNNER_DRIVER_TYPES.has(
      dataSource.options.type,
    );

    if (transactionSettings && dataSource.options.type !== 'postgres') {
      throw new TypeOrmTransactionSettingsUnsupportedException(
        dataSourceKey,
        dataSource.options.type,
      );
    }
  }

  /**
   * Create a new transaction instance bound to this factory's DataSource,
   * with the settings resolved from the scope's context.
   */
  create(ctx: AppContextHost): TransactionInterface {
    return new TypeOrmTransaction(
      this.dataSource,
      this.transactionSettings?.(ctx, this.dataSourceKey),
    );
  }
}
