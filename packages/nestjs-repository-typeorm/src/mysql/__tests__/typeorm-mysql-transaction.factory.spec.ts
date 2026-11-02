import { type DataSource } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { TypeOrmMysqlTransactionFactory } from '../typeorm-mysql-transaction.factory.js';
import { TypeOrmMysqlTransaction } from '../typeorm-mysql-transaction.js';

describe(TypeOrmMysqlTransactionFactory.name, () => {
  const factory = new TypeOrmMysqlTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  it('should create a MySQL transaction', () => {
    expect(factory.create()).toBeInstanceOf(TypeOrmMysqlTransaction);
  });

  it('should run transactions concurrently, each on its own connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(true);
  });
});
