import { type DataSource } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmOracleTransactionFactory } from '../typeorm-oracle-transaction.factory.js';
import { TypeOrmOracleTransaction } from '../typeorm-oracle-transaction.js';

describe(TypeOrmOracleTransactionFactory.name, () => {
  const factory = new TypeOrmOracleTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  it('should create an Oracle transaction', () => {
    expect(factory.create(new AppContextHost())).toBeInstanceOf(
      TypeOrmOracleTransaction,
    );
  });

  it('should run transactions concurrently, each on its own connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(true);
  });

  it("should resolve the application context's values from the transaction's context and data source", () => {
    const values = vi.fn().mockReturnValue({ tenant_id: 't-1' });
    const ctx = new AppContextHost();

    new TypeOrmOracleTransactionFactory(mockDeep<DataSource>(), 'reports', {
      procedure: 'app_ctx_pkg.set_value',
      values,
    }).create(ctx);

    expect(values).toHaveBeenCalledWith(ctx, 'reports');
  });
});
