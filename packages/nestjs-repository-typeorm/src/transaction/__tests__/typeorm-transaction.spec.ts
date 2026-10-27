import {
  type DatabaseType,
  type DataSource,
  type EntityManager,
  type QueryRunner,
} from 'typeorm';
import { type Mock } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { AppContextHost } from '@concepta/nestjs-core';

import { TypeOrmTransactionSettingsUnsupportedException } from '../../exceptions/typeorm-transaction-settings-unsupported.exception.js';
import { TypeOrmTransactionFactory } from '../typeorm-transaction.factory.js';
import { TypeOrmTransaction } from '../typeorm-transaction.js';

interface MockQueryRunner {
  connect: Mock;
  startTransaction: Mock;
  commitTransaction: Mock;
  rollbackTransaction: Mock;
  release: Mock;
  query: Mock;
  isTransactionActive: boolean;
  manager: EntityManager | undefined;
}

describe(TypeOrmTransaction.name, () => {
  let transaction: TypeOrmTransaction;
  let mockDataSource: DeepMockProxy<DataSource>;
  let mockQueryRunner: MockQueryRunner;
  let mockEntityManager: DeepMockProxy<EntityManager>;

  beforeEach(() => {
    mockEntityManager = mockDeep<EntityManager>();

    mockQueryRunner = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue(undefined),
      isTransactionActive: false,
      manager: mockEntityManager,
    };

    mockDataSource = mockDeep<DataSource>();
    mockDataSource.createQueryRunner.mockReturnValue(
      mockQueryRunner as unknown as QueryRunner,
    );

    transaction = new TypeOrmTransaction(mockDataSource);
  });

  describe('isActive', () => {
    it('should return false when no query runner', () => {
      expect(transaction.isActive).toBe(false);
    });

    it('should return query runner transaction active state', async () => {
      await transaction.start();
      mockQueryRunner.isTransactionActive = true;
      expect(transaction.isActive).toBe(true);
    });
  });

  describe('start', () => {
    it('should create query runner, connect, and start transaction', async () => {
      await transaction.start();

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    });

    it('should release the query runner and rethrow when startTransaction() rejects', async () => {
      const startError = new Error('deadlock detected');
      mockQueryRunner.startTransaction.mockRejectedValueOnce(startError);

      await expect(transaction.start()).rejects.toBe(startError);

      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(transaction.isActive).toBe(false);
    });

    it('should roll back before releasing when startTransaction() rejects with a transaction open', async () => {
      const startError = new Error('afterTransactionStart subscriber failed');
      const calls: string[] = [];
      // BEGIN went through; a later step inside startTransaction() threw.
      mockQueryRunner.startTransaction.mockImplementationOnce(async () => {
        mockQueryRunner.isTransactionActive = true;
        throw startError;
      });
      mockQueryRunner.rollbackTransaction.mockImplementationOnce(async () => {
        calls.push('rollback');
      });
      mockQueryRunner.release.mockImplementationOnce(async () => {
        calls.push('release');
      });

      await expect(transaction.start()).rejects.toBe(startError);

      expect(calls).toEqual(['rollback', 'release']);
    });

    it('should release the query runner and rethrow when connect() rejects', async () => {
      const connectError = new Error('connection pool exhausted');
      mockQueryRunner.connect.mockRejectedValueOnce(connectError);

      await expect(transaction.start()).rejects.toBe(connectError);

      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(transaction.isActive).toBe(false);
    });

    it('should still rethrow the original error when the release-on-failure itself also fails', async () => {
      const startError = new Error('deadlock detected');
      mockQueryRunner.startTransaction.mockRejectedValueOnce(startError);
      mockQueryRunner.release.mockRejectedValueOnce(
        new Error('release failed'),
      );

      await expect(transaction.start()).rejects.toBe(startError);
    });

    it('should not leave a stale query runner behind after a failed start(), so getClient() still throws', async () => {
      mockQueryRunner.startTransaction.mockRejectedValueOnce(
        new Error('deadlock detected'),
      );

      await expect(transaction.start()).rejects.toThrow();

      expect(() => transaction.getClient()).toThrow(
        'No active transaction - cannot get client',
      );
    });

    it('should run no statements of its own without settings', async () => {
      await transaction.start();

      expect(mockQueryRunner.query).not.toHaveBeenCalled();
    });
  });

  describe('start with settings', () => {
    const calls: string[] = [];

    beforeEach(() => {
      calls.length = 0;
      mockQueryRunner.startTransaction.mockImplementation(async () => {
        calls.push('begin');
        mockQueryRunner.isTransactionActive = true;
      });
      mockQueryRunner.query.mockImplementation(
        async (_sql: string, params: string[]) => {
          calls.push(params.join('='));
        },
      );
      mockQueryRunner.rollbackTransaction.mockImplementation(async () => {
        calls.push('rollback');
        mockQueryRunner.isTransactionActive = false;
      });
      mockQueryRunner.release.mockImplementation(async () => {
        calls.push('release');
      });
    });

    it('should apply each setting after BEGIN, in order, skipping undefined values', async () => {
      await new TypeOrmTransaction(mockDataSource, {
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

    it('should roll back, release and rethrow when a setting fails', async () => {
      const settingError = new Error('invalid configuration parameter name');
      mockQueryRunner.query.mockRejectedValueOnce(settingError);
      const tx = new TypeOrmTransaction(mockDataSource, {
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
        new TypeOrmTransaction(mockDataSource, {
          'app.tenant_id': 't-1',
        }).start(),
      ).rejects.toBe(settingError);

      expect(calls).toEqual(['begin', 'release']);
    });
  });

  describe('commit', () => {
    it('should throw if no active transaction', async () => {
      await expect(transaction.commit()).rejects.toThrow(
        expect.objectContaining({
          fault: 'internal',
          message: 'No active transaction to commit',
        }),
      );
    });

    it('should commit transaction and release query runner', async () => {
      await transaction.start();
      await transaction.commit();

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should release query runner even if commit fails', async () => {
      await transaction.start();
      mockQueryRunner.commitTransaction.mockRejectedValueOnce(
        new Error('Commit failed'),
      );

      await expect(transaction.commit()).rejects.toThrow('Commit failed');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('rollback', () => {
    it('should do nothing if no query runner', async () => {
      await transaction.rollback();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should rollback and release when transaction is active', async () => {
      await transaction.start();
      mockQueryRunner.isTransactionActive = true;

      await transaction.rollback();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should only release when transaction is not active', async () => {
      await transaction.start();
      mockQueryRunner.isTransactionActive = false;

      await transaction.rollback();

      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should release query runner even if rollback fails', async () => {
      await transaction.start();
      mockQueryRunner.isTransactionActive = true;
      mockQueryRunner.rollbackTransaction.mockRejectedValueOnce(
        new Error('Rollback failed'),
      );

      await expect(transaction.rollback()).rejects.toThrow('Rollback failed');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should throw if no active transaction', () => {
      expect(() => transaction.getClient()).toThrow(
        expect.objectContaining({
          fault: 'internal',
          message: 'No active transaction - cannot get client',
        }),
      );
    });

    it('should return entity manager when transaction is active', async () => {
      await transaction.start();

      const client = transaction.getClient<EntityManager>();
      expect(client).toBe(mockEntityManager);
    });

    it('should throw if query runner has no manager', async () => {
      await transaction.start();
      (mockQueryRunner as { manager: EntityManager | undefined }).manager =
        undefined;

      expect(() => transaction.getClient()).toThrow(
        'No active transaction - cannot get client',
      );
    });
  });
});

// DataSource.options is declared readonly; mockDeep<DataSource>() preserves
// that in its type, but each test needs to swap in a different driver type,
// so it's set via defineProperty rather than direct assignment.
//
// Typed on `type` alone rather than DataSourceOptions: the factory reads only
// that field, and `sqlite` is absent from 1.x's DatabaseType while still
// needing coverage for 0.3 consumers.
function setDataSourceOptions(
  dataSource: DataSource,
  options: {
    readonly type: DatabaseType | 'sqlite';
    readonly database?: string;
  },
): void {
  Object.defineProperty(dataSource, 'options', {
    value: options,
    configurable: true,
  });
}

describe(TypeOrmTransactionFactory.name, () => {
  let factory: TypeOrmTransactionFactory;
  let mockDataSource: DeepMockProxy<DataSource>;

  beforeEach(() => {
    mockDataSource = mockDeep<DataSource>();
    setDataSourceOptions(mockDataSource, { type: 'postgres' });
    factory = new TypeOrmTransactionFactory(mockDataSource);
  });

  describe('create', () => {
    it('should create a TypeOrmTransaction instance', () => {
      const transaction = factory.create(new AppContextHost());
      expect(transaction).toBeInstanceOf(TypeOrmTransaction);
    });

    it('should create new transaction on each call', () => {
      const tx1 = factory.create(new AppContextHost());
      const tx2 = factory.create(new AppContextHost());
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

      await new TypeOrmTransactionFactory(
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
  });

  describe('transactionSettings', () => {
    it.each(['better-sqlite3', 'mysql'] as const)(
      'should be refused at construction for %s',
      (type) => {
        setDataSourceOptions(mockDataSource, { type });

        expect(
          () =>
            new TypeOrmTransactionFactory(mockDataSource, 'primary', vi.fn()),
        ).toThrow(TypeOrmTransactionSettingsUnsupportedException);
      },
    );

    it('should not be required for another database', () => {
      setDataSourceOptions(mockDataSource, { type: 'better-sqlite3' });

      expect(() => new TypeOrmTransactionFactory(mockDataSource)).not.toThrow();
    });
  });

  describe('supportsConcurrentTransactions', () => {
    it('should be true for postgres, which gives each transaction its own connection', () => {
      setDataSourceOptions(mockDataSource, { type: 'postgres' });
      expect(
        new TypeOrmTransactionFactory(mockDataSource)
          .supportsConcurrentTransactions,
      ).toBe(true);
    });

    it('should be false for sqlite, which shares one QueryRunner per data source', () => {
      setDataSourceOptions(mockDataSource, {
        type: 'sqlite',
        database: ':memory:',
      });
      expect(
        new TypeOrmTransactionFactory(mockDataSource)
          .supportsConcurrentTransactions,
      ).toBe(false);
    });

    it('should be false for better-sqlite3', () => {
      setDataSourceOptions(mockDataSource, {
        type: 'better-sqlite3',
        database: ':memory:',
      });
      expect(
        new TypeOrmTransactionFactory(mockDataSource)
          .supportsConcurrentTransactions,
      ).toBe(false);
    });
  });
});
