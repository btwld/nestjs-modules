import { type DataSource } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { TypeOrmSqlServerTransactionFactory } from '../typeorm-sqlserver-transaction.factory.js';
import { TypeOrmSqlServerTransaction } from '../typeorm-sqlserver-transaction.js';

describe(TypeOrmSqlServerTransactionFactory.name, () => {
  const factory = new TypeOrmSqlServerTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  it('should create a SQL Server transaction', () => {
    expect(factory.create()).toBeInstanceOf(TypeOrmSqlServerTransaction);
  });

  it('should run transactions concurrently, each on its own connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(true);
  });
});
