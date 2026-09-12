import { type DataSource, type EntityManager, type QueryRunner } from 'typeorm';
import { type Mock } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { TypeOrmTransactionFactory } from '../typeorm-transaction.factory.js';
import { TypeOrmTransaction } from '../typeorm-transaction.js';

interface MockQueryRunner {
  connect: Mock;
  startTransaction: Mock;
  commitTransaction: Mock;
  rollbackTransaction: Mock;
  release: Mock;
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
  });

  describe('commit', () => {
    it('should throw if no active transaction', async () => {
      await expect(transaction.commit()).rejects.toThrow(
        'No active transaction to commit',
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
        'No active transaction - cannot get client',
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

describe(TypeOrmTransactionFactory.name, () => {
  let factory: TypeOrmTransactionFactory;
  let mockDataSource: DeepMockProxy<DataSource>;

  beforeEach(() => {
    mockDataSource = mockDeep<DataSource>();
    factory = new TypeOrmTransactionFactory(mockDataSource);
  });

  describe('create', () => {
    it('should create a TypeOrmTransaction instance', () => {
      const transaction = factory.create();
      expect(transaction).toBeInstanceOf(TypeOrmTransaction);
    });

    it('should create new transaction on each call', () => {
      const tx1 = factory.create();
      const tx2 = factory.create();
      expect(tx1).not.toBe(tx2);
    });
  });
});
