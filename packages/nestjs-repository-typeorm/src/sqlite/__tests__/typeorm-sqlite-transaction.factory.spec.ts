import { type DataSource } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { TypeOrmSqliteTransactionFactory } from '../typeorm-sqlite-transaction.factory.js';
import { TypeOrmSqliteTransaction } from '../typeorm-sqlite-transaction.js';

describe(TypeOrmSqliteTransactionFactory.name, () => {
  const factory = new TypeOrmSqliteTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  it('should create a SQLite transaction', () => {
    expect(factory.create()).toBeInstanceOf(TypeOrmSqliteTransaction);
  });

  it('should run transactions one at a time on the one connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(false);
  });
});
