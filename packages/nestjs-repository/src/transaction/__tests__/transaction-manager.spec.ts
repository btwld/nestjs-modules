import { type Mock } from 'vitest';

import { TransactionClosedException } from '../../exceptions/transaction-closed.exception.js';
import { TransactionHeuristicCommitException } from '../../exceptions/transaction-heuristic-commit.exception.js';
import { type TransactionInterface } from '../interfaces/transaction.interface.js';
import { TransactionFactoryRegistry } from '../transaction-factory-registry.js';
import { TransactionManager } from '../transaction-manager.js';

describe(TransactionManager.name, () => {
  let manager: TransactionManager;
  let registry: TransactionFactoryRegistry;

  const createMockTransaction = (
    overrides: Partial<{
      isActive: boolean;
      start: Mock;
      commit: Mock;
      rollback: Mock;
      getClient: Mock;
    }> = {},
  ): TransactionInterface => ({
    isActive: false,
    start: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    getClient: vi.fn(),
    ...overrides,
  });

  const seed = async (
    manager: TransactionManager,
    registry: TransactionFactoryRegistry,
    key: string,
    tx: TransactionInterface,
  ): Promise<void> => {
    registry.register(key, { create: () => tx });
    await manager.getOrStart(key);
  };

  beforeEach(() => {
    registry = new TransactionFactoryRegistry();
    manager = new TransactionManager(registry);
  });

  describe('getOrStart', () => {
    it('should create and start transaction lazily via factory', async () => {
      const newTx = createMockTransaction();
      registry.register('typeorm:default', { create: () => newTx });

      const result = await manager.getOrStart('typeorm:default');

      expect(result).toBe(newTx);
      expect(newTx.start).toHaveBeenCalledTimes(1);
    });

    it('should store lazily created transaction for subsequent gets', async () => {
      const newTx = createMockTransaction();
      registry.register('typeorm:default', { create: () => newTx });

      await manager.getOrStart('typeorm:default');
      const second = await manager.getOrStart('typeorm:default');

      expect(second).toBe(newTx);
      expect(newTx.start).toHaveBeenCalledTimes(1);
    });

    it('should throw when no factory registered for key', async () => {
      await expect(manager.getOrStart('unknown:key')).rejects.toThrow(
        'No transaction factory registered for key "unknown:key"',
      );
    });

    it('should throw TransactionClosedException once the scope is closed', async () => {
      manager.close();

      await expect(manager.getOrStart('typeorm:default')).rejects.toThrow(
        TransactionClosedException,
      );
    });
  });

  describe('concurrent calls to getOrStart for the same key', () => {
    /**
     * Registers a factory whose `start()` is gated on a manually-released
     * promise, then fires two `getOrStart` calls back-to-back without
     * awaiting either — this pins the interleaving exactly, rather than
     * relying on timers, so the race is deterministic.
     */
    const raceGetOrStart = (key: string) => {
      const created: TransactionInterface[] = [];
      let releaseStart: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        releaseStart = resolve;
      });

      registry.register(key, {
        create: () => {
          const tx: TransactionInterface = {
            isActive: true,
            start: vi.fn().mockImplementation(async () => {
              await gate;
            }),
            commit: vi.fn(),
            rollback: vi.fn(),
            getClient: vi.fn(),
          };
          created.push(tx);
          return tx;
        },
      });

      const first = manager.getOrStart(key);
      const second = manager.getOrStart(key);

      return { created, first, second, releaseStart };
    };

    it('should create only one transaction when two calls race before start() resolves', async () => {
      const { created, first, second, releaseStart } =
        raceGetOrStart('typeorm:default');

      releaseStart();
      const [a, b] = await Promise.all([first, second]);

      expect(created).toHaveLength(1);
      expect(a).toBe(b);
    });

    it('should settle the shared transaction once', async () => {
      const { created, first, second, releaseStart } =
        raceGetOrStart('typeorm:default');

      releaseStart();
      await Promise.all([first, second]);

      await manager.commitAll();

      expect(created[0].commit).toHaveBeenCalledTimes(1);
    });

    it('should skip a key whose start() rejected, in both commitAll and rollbackAll', async () => {
      registry.register('typeorm:broken', {
        create: () => ({
          isActive: false,
          start: vi.fn().mockRejectedValue(new Error('connect failed')),
          commit: vi.fn(),
          rollback: vi.fn(),
          getClient: vi.fn(),
        }),
      });

      await expect(manager.getOrStart('typeorm:broken')).rejects.toThrow(
        'connect failed',
      );

      await expect(manager.commitAll()).resolves.toBeUndefined();
      await expect(manager.rollbackAll()).resolves.toBeUndefined();
    });
  });

  describe('lifecycle state', () => {
    it('should default to not read-only, not closed, not failed', () => {
      expect(manager.isReadOnly).toBe(false);
      expect(manager.isClosed).toBe(false);
      expect(manager.hasFailed).toBe(false);
    });

    it('should carry the readOnly flag passed at construction', () => {
      const readOnlyManager = new TransactionManager(registry, true);
      expect(readOnlyManager.isReadOnly).toBe(true);
    });

    it('should track enter/exit depth', () => {
      expect(manager.enter()).toBe(1);
      expect(manager.enter()).toBe(2);
      expect(manager.exit()).toBe(1);
      expect(manager.exit()).toBe(0);
    });

    it('should record markFailed', () => {
      expect(manager.hasFailed).toBe(false);
      manager.markFailed();
      expect(manager.hasFailed).toBe(true);
    });

    it('should not abort the signal until markFailed is called', () => {
      expect(manager.signal.aborted).toBe(false);
    });

    it('should abort the signal with the given reason on markFailed', () => {
      const reason = new Error('doomed');
      manager.markFailed(reason);
      expect(manager.signal.aborted).toBe(true);
      expect(manager.signal.reason).toBe(reason);
    });

    it('should keep the first reason when markFailed is called more than once', () => {
      const first = new Error('first');
      const second = new Error('second');
      manager.markFailed(first);
      manager.markFailed(second);
      expect(manager.signal.reason).toBe(first);
    });

    it('should record close', () => {
      expect(manager.isClosed).toBe(false);
      manager.close();
      expect(manager.isClosed).toBe(true);
    });

    it('should throw TransactionClosedException from enter() once closed', () => {
      manager.close();
      expect(() => manager.enter()).toThrow(TransactionClosedException);
    });
  });

  describe('commitAll', () => {
    it('should commit active transactions, dirtied or not', async () => {
      const tx = createMockTransaction({ isActive: true });
      await seed(manager, registry, 'typeorm:default', tx);

      await manager.commitAll();

      expect(tx.commit).toHaveBeenCalledTimes(1);
      expect(tx.rollback).not.toHaveBeenCalled();
    });

    it('should skip inactive transactions', async () => {
      const inactiveTx = createMockTransaction({ isActive: false });
      await seed(manager, registry, 'typeorm:default', inactiveTx);

      await manager.commitAll();

      expect(inactiveTx.commit).not.toHaveBeenCalled();
      expect(inactiveTx.rollback).not.toHaveBeenCalled();
    });

    it('should handle multiple transactions', async () => {
      const activeTx = createMockTransaction({ isActive: true });
      const otherActiveTx = createMockTransaction({ isActive: true });
      const inactiveTx = createMockTransaction({ isActive: false });

      await seed(manager, registry, 'typeorm:default', activeTx);
      await seed(manager, registry, 'mongoose:default', otherActiveTx);
      await seed(manager, registry, 'prisma:default', inactiveTx);

      await manager.commitAll();

      expect(activeTx.commit).toHaveBeenCalledTimes(1);
      expect(otherActiveTx.commit).toHaveBeenCalledTimes(1);
      expect(inactiveTx.commit).not.toHaveBeenCalled();
      expect(inactiveTx.rollback).not.toHaveBeenCalled();
    });

    it('should roll back — rather than abandon — a transaction that comes after one whose commit fails', async () => {
      const firstTx = createMockTransaction({ isActive: true });
      const failingTx = createMockTransaction({
        isActive: true,
        commit: vi.fn().mockRejectedValue(new Error('commit failed')),
      });
      const abandonedTx = createMockTransaction({ isActive: true });

      await seed(manager, registry, 'typeorm:first', firstTx);
      await seed(manager, registry, 'typeorm:failing', failingTx);
      await seed(manager, registry, 'typeorm:abandoned', abandonedTx);

      await expect(manager.commitAll()).rejects.toThrow();

      expect(firstTx.commit).toHaveBeenCalledTimes(1);
      expect(failingTx.commit).toHaveBeenCalledTimes(1);
      expect(abandonedTx.commit).not.toHaveBeenCalled();
      expect(abandonedTx.rollback).toHaveBeenCalledTimes(1);
    });

    it('should reject with the original error when only one transaction is active', async () => {
      const originalError = new Error('commit failed');
      const failingTx = createMockTransaction({
        isActive: true,
        commit: vi.fn().mockRejectedValue(originalError),
      });

      await seed(manager, registry, 'typeorm:default', failingTx);

      await expect(manager.commitAll()).rejects.toBe(originalError);
    });

    it('should reject with the original error, not a heuristic exception, when multiple datasources are involved but none committed', async () => {
      const originalError = new Error('commit failed');
      const failingTx = createMockTransaction({
        isActive: true,
        commit: vi.fn().mockRejectedValue(originalError),
      });
      const neverAttemptedTx = createMockTransaction({ isActive: true });

      await seed(manager, registry, 'typeorm:failing', failingTx);
      await seed(manager, registry, 'typeorm:neverAttempted', neverAttemptedTx);

      // Nothing committed and both were rolled back — a clean, atomic
      // outcome, not a mixed one. The real error should surface directly
      // rather than be buried in a heuristic exception's originalError.
      await expect(manager.commitAll()).rejects.toBe(originalError);
    });

    it('should reject with TransactionHeuristicCommitException when a later datasource fails after an earlier one already committed', async () => {
      const originalError = new Error('commit failed');
      const committedTx = createMockTransaction({ isActive: true });
      const failingTx = createMockTransaction({
        isActive: true,
        commit: vi.fn().mockRejectedValue(originalError),
      });

      await seed(manager, registry, 'typeorm:committed', committedTx);
      await seed(manager, registry, 'typeorm:failing', failingTx);

      let caught: unknown;
      try {
        await manager.commitAll();
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(TransactionHeuristicCommitException);
      const exception = caught as TransactionHeuristicCommitException;
      expect(exception.context.originalError?.message).toBe(
        originalError.message,
      );
      expect(exception.message).toContain('1');
      expect(committedTx.commit).toHaveBeenCalledTimes(1);
      expect(committedTx.rollback).not.toHaveBeenCalled();
    });
  });

  describe('rollbackAll', () => {
    it('should rollback active transactions', async () => {
      const activeTx = createMockTransaction({ isActive: true });
      await seed(manager, registry, 'typeorm:default', activeTx);

      await manager.rollbackAll();

      expect(activeTx.rollback).toHaveBeenCalledTimes(1);
    });

    it('should skip inactive transactions', async () => {
      const inactiveTx = createMockTransaction({ isActive: false });
      await seed(manager, registry, 'typeorm:default', inactiveTx);

      await manager.rollbackAll();

      expect(inactiveTx.rollback).not.toHaveBeenCalled();
    });

    it('should handle multiple transactions', async () => {
      const activeTx1 = createMockTransaction({ isActive: true });
      const activeTx2 = createMockTransaction({ isActive: true });
      const inactiveTx = createMockTransaction({ isActive: false });

      await seed(manager, registry, 'typeorm:default', activeTx1);
      await seed(manager, registry, 'mongoose:default', activeTx2);
      await seed(manager, registry, 'prisma:default', inactiveTx);

      await manager.rollbackAll();

      expect(activeTx1.rollback).toHaveBeenCalledTimes(1);
      expect(activeTx2.rollback).toHaveBeenCalledTimes(1);
      expect(inactiveTx.rollback).not.toHaveBeenCalled();
    });

    it('should still roll back the other transactions when one rollback fails', async () => {
      const failingTx = createMockTransaction({
        isActive: true,
        rollback: vi.fn().mockRejectedValue(new Error('rollback failed')),
      });
      const otherTx = createMockTransaction({ isActive: true });

      await seed(manager, registry, 'typeorm:failing', failingTx);
      await seed(manager, registry, 'typeorm:other', otherTx);

      await manager.rollbackAll();

      expect(otherTx.rollback).toHaveBeenCalledTimes(1);
    });

    it('should never reject, even when a rollback fails', async () => {
      const failingTx = createMockTransaction({
        isActive: true,
        rollback: vi.fn().mockRejectedValue(new Error('rollback failed')),
      });
      await seed(manager, registry, 'typeorm:default', failingTx);

      await expect(manager.rollbackAll()).resolves.toBeUndefined();
    });

    it('should never reject, even when a rollback fails with a non-Error, non-string-coercible reason', async () => {
      const failingTx = createMockTransaction({
        isActive: true,
        rollback: vi.fn().mockRejectedValue(Object.create(null)),
      });
      await seed(manager, registry, 'typeorm:default', failingTx);

      await expect(manager.rollbackAll()).resolves.toBeUndefined();
    });

    it('should never reject, even when a rollback fails with a Symbol reason', async () => {
      const failingTx = createMockTransaction({
        isActive: true,
        rollback: vi.fn().mockRejectedValue(Symbol('boom')),
      });
      await seed(manager, registry, 'typeorm:default', failingTx);

      await expect(manager.rollbackAll()).resolves.toBeUndefined();
    });
  });

  describe('onCommit / flushOnCommitCallbacks', () => {
    it('should execute callbacks in order on flush', async () => {
      const order: number[] = [];
      manager.onCommit(() => {
        order.push(1);
      });
      manager.onCommit(() => {
        order.push(2);
      });
      manager.onCommit(() => {
        order.push(3);
      });

      await manager.flushOnCommitCallbacks();

      expect(order).toEqual([1, 2, 3]);
    });

    it('should run async callbacks sequentially, in registration order, not concurrently', async () => {
      const order: number[] = [];
      manager.onCommit(async () => {
        // Slower than the others — a concurrent flush would let callbacks
        // 2 and 3 finish first, since they never yield.
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push(1);
      });
      manager.onCommit(async () => {
        order.push(2);
      });
      manager.onCommit(async () => {
        order.push(3);
      });

      await manager.flushOnCommitCallbacks();

      expect(order).toEqual([1, 2, 3]);
    });

    it('should clear callbacks after flush', async () => {
      const fn = vi.fn();
      manager.onCommit(fn);

      await manager.flushOnCommitCallbacks();
      await manager.flushOnCommitCallbacks();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not execute callbacks until flushed', () => {
      const fn = vi.fn();
      manager.onCommit(fn);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should not reject and should still run other callbacks when one rejects with undefined', async () => {
      const fn = vi.fn();
      manager.onCommit(async () => {
        throw undefined;
      });
      manager.onCommit(fn);

      await expect(manager.flushOnCommitCallbacks()).resolves.toBeUndefined();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not reject when a callback rejects with null', async () => {
      manager.onCommit(async () => {
        throw null;
      });

      await expect(manager.flushOnCommitCallbacks()).resolves.toBeUndefined();
    });

    it('should not reject when a callback rejects with a non-Error, non-string-coercible reason', async () => {
      const fn = vi.fn();
      manager.onCommit(async () => {
        throw Object.create(null);
      });
      manager.onCommit(fn);

      await expect(manager.flushOnCommitCallbacks()).resolves.toBeUndefined();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not reject when a callback rejects with a Symbol', async () => {
      manager.onCommit(async () => {
        throw Symbol('boom');
      });

      await expect(manager.flushOnCommitCallbacks()).resolves.toBeUndefined();
    });

    it('should throw TransactionClosedException rather than silently drop a registration after close()', () => {
      manager.close();
      expect(() => manager.onCommit(() => {})).toThrow(
        TransactionClosedException,
      );
    });
  });

  describe('onRollback / flushOnRollbackCallbacks', () => {
    it('should execute callbacks in order on flush', async () => {
      const order: number[] = [];
      manager.onRollback(() => {
        order.push(1);
      });
      manager.onRollback(() => {
        order.push(2);
      });
      manager.onRollback(() => {
        order.push(3);
      });

      await manager.flushOnRollbackCallbacks();

      expect(order).toEqual([1, 2, 3]);
    });

    it('should run async callbacks sequentially, in registration order, not concurrently', async () => {
      const order: number[] = [];
      manager.onRollback(async () => {
        // Slower than the others — a concurrent flush would let callbacks
        // 2 and 3 finish first, since they never yield.
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push(1);
      });
      manager.onRollback(async () => {
        order.push(2);
      });
      manager.onRollback(async () => {
        order.push(3);
      });

      await manager.flushOnRollbackCallbacks();

      expect(order).toEqual([1, 2, 3]);
    });

    it('should clear callbacks after flush', async () => {
      const fn = vi.fn();
      manager.onRollback(fn);

      await manager.flushOnRollbackCallbacks();
      await manager.flushOnRollbackCallbacks();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not execute callbacks until flushed', () => {
      const fn = vi.fn();
      manager.onRollback(fn);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should not reject and should still run other callbacks when one rejects with undefined', async () => {
      const fn = vi.fn();
      manager.onRollback(async () => {
        throw undefined;
      });
      manager.onRollback(fn);

      await expect(manager.flushOnRollbackCallbacks()).resolves.toBeUndefined();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw TransactionClosedException rather than silently drop a registration after close()', () => {
      manager.close();
      expect(() => manager.onRollback(() => {})).toThrow(
        TransactionClosedException,
      );
    });
  });
});
