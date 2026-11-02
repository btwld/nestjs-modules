import { type DataSource, type QueryRunner } from 'typeorm';
import { mockDeep } from 'vitest-mock-extended';

import { AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmSqlServerTransactionFactory } from '../typeorm-sqlserver-transaction.factory.js';
import { TypeOrmSqlServerTransaction } from '../typeorm-sqlserver-transaction.js';

describe(TypeOrmSqlServerTransactionFactory.name, () => {
  const factory = new TypeOrmSqlServerTransactionFactory(
    mockDeep<DataSource>(),
    'default',
  );

  /** A data source whose transactions record the parameters they set. */
  function recordingDataSource() {
    const queryRunner = mockDeep<QueryRunner>();
    const dataSource = mockDeep<DataSource>();
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    const setParameters = () => queryRunner.query.mock.lastCall?.[1];
    return { dataSource, setParameters };
  }

  it('should create a SQL Server transaction', () => {
    expect(factory.create(new AppContextHost())).toBeInstanceOf(
      TypeOrmSqlServerTransaction,
    );
  });

  it('should run transactions concurrently, each on its own connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(true);
  });

  it("should set the session context resolved from the transaction's context and data source", async () => {
    const { dataSource, setParameters } = recordingDataSource();
    const sessionContext = vi.fn().mockReturnValue({ tenant_id: 't-1' });
    const ctx = new AppContextHost();

    await new TypeOrmSqlServerTransactionFactory(
      dataSource,
      'reports',
      sessionContext,
    )
      .create(ctx)
      .start();

    expect(sessionContext).toHaveBeenCalledWith(ctx, 'reports');
    expect(setParameters()).toEqual(['tenant_id', 't-1']);
  });

  it('should set a name an earlier transaction set to NULL when this one leaves it out', async () => {
    const { dataSource, setParameters } = recordingDataSource();
    const sessionContext = vi
      .fn()
      .mockReturnValueOnce({ tenant_id: 't-1' })
      .mockReturnValueOnce({});
    const sqlServer = new TypeOrmSqlServerTransactionFactory(
      dataSource,
      'default',
      sessionContext,
    );

    await sqlServer.create(new AppContextHost()).start();
    await sqlServer.create(new AppContextHost()).start();

    expect(setParameters()).toEqual(['tenant_id', null]);
  });
});
