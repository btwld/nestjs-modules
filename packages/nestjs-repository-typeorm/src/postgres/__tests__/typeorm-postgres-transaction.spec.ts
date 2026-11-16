import { type DataSource, type QueryRunner } from 'typeorm';
import { type Mock } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmPostgresTransactionFactory } from '../typeorm-postgres-transaction.factory.js';
import { TypeOrmPostgresTransaction } from '../typeorm-postgres-transaction.js';

interface MockQueryRunner {
  connect: Mock;
  startTransaction: Mock;
  rollbackTransaction: Mock;
  release: Mock;
  query: Mock;
  isTransactionActive: boolean;
}

describe(TypeOrmPostgresTransaction.name, () => {
  let mockDataSource: DeepMockProxy<DataSource>;
  let mockQueryRunner: MockQueryRunner;
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;
    mockQueryRunner = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn(async () => {
        calls.push('begin');
        mockQueryRunner.isTransactionActive = true;
      }),
      rollbackTransaction: vi.fn(async () => {
        calls.push('rollback');
        mockQueryRunner.isTransactionActive = false;
      }),
      release: vi.fn(async () => {
        calls.push('release');
      }),
      query: vi.fn(async (_sql: string, params: string[]) => {
        calls.push(params.join('='));
      }),
      isTransactionActive: false,
    };

    mockDataSource = mockDeep<DataSource>();
    mockDataSource.createQueryRunner.mockReturnValue(
      mockQueryRunner as unknown as QueryRunner,
    );
  });

  it('should apply each setting after BEGIN, in order, skipping undefined values', async () => {
    await new TypeOrmPostgresTransaction(mockDataSource, {
      'app.tenant_id': 't-1',
      'app.user_id': undefined,
      'app.region': 'eu',
    }).start();

    expect(calls).toEqual(['begin', 'app.tenant_id=t-1', 'app.region=eu']);
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      'select set_config($1, $2, true)',
      ['app.tenant_id', 't-1'],
    );
  });

  it('should run no statements of its own without settings', async () => {
    await new TypeOrmPostgresTransaction(mockDataSource).start();

    expect(mockQueryRunner.query).not.toHaveBeenCalled();
  });

  it('should roll back, release and rethrow when a setting fails', async () => {
    const settingError = new Error('invalid configuration parameter name');
    mockQueryRunner.query.mockRejectedValueOnce(settingError);
    const tx = new TypeOrmPostgresTransaction(mockDataSource, {
      'app.tenant_id': 't-1',
    });

    await expect(tx.start()).rejects.toBe(settingError);

    expect(calls).toEqual(['begin', 'rollback', 'release']);
    expect(tx.isActive).toBe(false);
    expect(() => tx.getClient()).toThrow(
      'No active transaction - cannot get client',
    );
  });

  it('should still release and rethrow the setting error when the rollback fails', async () => {
    const settingError = new Error('invalid configuration parameter name');
    mockQueryRunner.query.mockRejectedValueOnce(settingError);
    mockQueryRunner.rollbackTransaction.mockRejectedValueOnce(
      new Error('connection lost'),
    );

    await expect(
      new TypeOrmPostgresTransaction(mockDataSource, {
        'app.tenant_id': 't-1',
      }).start(),
    ).rejects.toBe(settingError);

    expect(calls).toEqual(['begin', 'release']);
  });
});

describe(TypeOrmPostgresTransactionFactory.name, () => {
  let mockDataSource: DeepMockProxy<DataSource>;
  let factory: TypeOrmPostgresTransactionFactory;

  beforeEach(() => {
    mockDataSource = mockDeep<DataSource>();
    factory = new TypeOrmPostgresTransactionFactory(mockDataSource, 'default');
  });

  it('should create a new Postgres transaction on each call', () => {
    const tx1 = factory.create(new AppContextHost());
    const tx2 = factory.create(new AppContextHost());

    expect(tx1).toBeInstanceOf(TypeOrmPostgresTransaction);
    expect(tx1).not.toBe(tx2);
  });

  it("should resolve the settings from the scope's context and apply them on start", async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    mockDataSource.createQueryRunner.mockReturnValue(
      mockDeep<QueryRunner>({ query }),
    );
    const ctx = new AppContextHost();
    const transactionSettings = vi.fn().mockReturnValue({
      'app.tenant_id': 't-1',
    });

    await new TypeOrmPostgresTransactionFactory(
      mockDataSource,
      'primary',
      transactionSettings,
    )
      .create(ctx)
      .start();

    expect(transactionSettings).toHaveBeenCalledWith(ctx, 'primary');
    expect(query).toHaveBeenCalledWith('select set_config($1, $2, true)', [
      'app.tenant_id',
      't-1',
    ]);
  });

  it('should run transactions concurrently, each on its own connection', () => {
    expect(factory.supportsConcurrentTransactions).toBe(true);
  });
});
