import { type DatabaseType, DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';

import {
  TransactionInterface,
  TransactionFactoryInterface,
} from '@concepta/nestjs-repository';

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

  constructor(private readonly dataSource: DataSource) {
    this.supportsConcurrentTransactions = !SHARED_QUERY_RUNNER_DRIVER_TYPES.has(
      dataSource.options.type,
    );
  }

  /**
   * Create a new transaction instance bound to this factory's DataSource.
   */
  create(): TransactionInterface {
    return new TypeOrmTransaction(this.dataSource);
  }
}
