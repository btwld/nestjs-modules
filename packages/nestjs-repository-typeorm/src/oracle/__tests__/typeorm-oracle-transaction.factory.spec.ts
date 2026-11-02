import { type DataSource } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { TypeOrmOracleTransactionFactory } from '../typeorm-oracle-transaction.factory.js';
import { TypeOrmOracleTransaction } from '../typeorm-oracle-transaction.js';

describe(TypeOrmOracleTransactionFactory.name, () => {
  const factory = new TypeOrmOracleTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  it('should create an Oracle transaction', () => {
    expect(factory.create()).toBeInstanceOf(TypeOrmOracleTransaction);
  });

  it('should run transactions concurrently, each on its own connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(true);
  });
});
