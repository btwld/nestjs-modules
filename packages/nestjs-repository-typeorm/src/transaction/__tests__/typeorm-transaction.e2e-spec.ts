import { type DataSource } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { AppModuleFixture } from '../../__fixtures__/repository/module/app.module.fixture.js';
import { TypeOrmTransaction } from '../typeorm-transaction.js';

/**
 * Root-cause pin for #476: TypeORM's SqliteDriver returns one shared
 * QueryRunner per DataSource, and `startTransaction()` only records a
 * transaction as open (`transactionDepth += 1`) *after* its `BEGIN TRANSACTION`
 * query resolves. Two `TypeOrmTransaction`s that both call `start()` before
 * either's BEGIN has resolved both see "no transaction open yet" and both
 * issue a real BEGIN — the second is rejected by SQLite itself with
 * "cannot start a transaction within a transaction".
 *
 * `TransactionManager`'s per-key queue (`transaction-manager.ts`) exists to
 * prevent exactly this, one layer above `TypeOrmTransaction` — this test
 * exercises `TypeOrmTransaction` directly, unserialized, to pin that the
 * underlying driver behavior this issue depends on stays reproducible.
 */
describe('TypeOrmTransaction — unserialized concurrent start() on a shared SQLite connection (#476)', () => {
  let moduleFixture: TestingModule;
  let dataSource: DataSource;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    dataSource = moduleFixture.get(getDataSourceToken());
  });

  it('should let one of two concurrent, unserialized transactions fail with a driver-level nested-transaction error', async () => {
    const txA = new TypeOrmTransaction(dataSource);
    const txB = new TypeOrmTransaction(dataSource);

    const results = await Promise.allSettled([txA.start(), txB.start()]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const [{ reason }] = rejected;
    expect(reason.message).toContain('transaction');

    if (txA.isActive) await txA.rollback();
    if (txB.isActive) await txB.rollback();
  });
});
