import { type DatabaseType, DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';

import {
  TransactionInterface,
  TransactionFactoryInterface,
} from '@concepta/nestjs-repository';

import { TypeOrmTransaction } from './typeorm-transaction.js';

// TypeORM 0.3.31 drivers whose createQueryRunner() returns one shared
// QueryRunner per DataSource, rather than a fresh one per call — confirmed
// by grepping node_modules/typeorm/driver/*/[A-Z]*Driver.js for the
// `if (!this.queryRunner) this.queryRunner = new ...` caching pattern. A
// second BEGIN on that shared connection while the first transaction is
// still open fails at the driver level (concepta/nestjs-modules#476), so
// these are the drivers that need TransactionManager to serialize
// transactions rather than let them race. `postgres` (and everything else
// not listed) hands out a fresh connection/QueryRunner per transaction and
// is unaffected.
//
// `mongodb` also caches a single shared QueryRunner (assigned in its own
// connect(), not the grepped pattern above) but is deliberately excluded:
// its startTransaction()/commitTransaction() are documented no-ops ("not
// supported by mongodb driver"), so there's no BEGIN for a second caller to
// collide with.
const SHARED_QUERY_RUNNER_DRIVER_TYPES = new Set<DatabaseType>([
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
