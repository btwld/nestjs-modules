import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppContextHost } from '@concepta/nestjs-core';

import { TransactionClosedException } from '../../exceptions/transaction-closed.exception.js';
import { TransactionReadOnlyConflictException } from '../../exceptions/transaction-read-only-conflict.exception.js';
import { TransactionScopeFailedException } from '../../exceptions/transaction-scope-failed.exception.js';
import { TransactionTimeoutException } from '../../exceptions/transaction-timeout.exception.js';
import { REPOSITORY_MODULE_OPTIONS } from '../../repository.constants.js';
import {
  type TransactionContextInterface,
  TrxCtx,
} from '../interfaces/transaction-context.interface.js';
import { type TransactionInterface } from '../interfaces/transaction.interface.js';
import {
  TransactionFactoryRegistry,
  TRANSACTION_FACTORY_REGISTRY,
} from '../transaction-factory-registry.js';
import { TransactionScope } from '../transaction-scope.js';

describe(TransactionScope.name, () => {
  let transaction: TransactionScope;
  let mockRegistry: TransactionFactoryRegistry;

  const createMockTransaction = (): TransactionInterface => {
    let isActive = false;

    return {
      get isActive() {
        return isActive;
      },
      start: vi.fn().mockImplementation(async () => {
        isActive = true;
      }),
      commit: vi.fn().mockImplementation(async () => {
        isActive = false;
      }),
      rollback: vi.fn().mockImplementation(async () => {
        isActive = false;
      }),
      getClient: vi.fn(),
    };
  };

  beforeEach(async () => {
    mockRegistry = new TransactionFactoryRegistry();
    mockRegistry.register('default', { create: createMockTransaction });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionScope,
        {
          provide: TRANSACTION_FACTORY_REGISTRY,
          useValue: mockRegistry,
        },
        {
          provide: REPOSITORY_MODULE_OPTIONS,
          useValue: { defaultTimeout: 30000 },
        },
      ],
    }).compile();

    transaction = moduleRef.get<TransactionScope>(TransactionScope);
  });

  describe('run', () => {
    it('should auto-define TrxCtx and run lifecycle', async () => {
      const ctx = new AppContextHost();
      const operation = vi.fn().mockResolvedValue('result');

      const result = await transaction.run(ctx, operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledWith(
        expect.objectContaining({
          trx: expect.objectContaining({
            onCommit: expect.any(Function),
            onRollback: expect.any(Function),
          }),
        }),
      );
    });

    it('should accept a plain object and coerce via AppContextHost.from()', async () => {
      const ctx = {};
      const operation = vi.fn().mockResolvedValue('result');

      const result = await transaction.run(ctx, operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });

    it('should detect nested call via supports(TrxCtx)', async () => {
      const ctx = new AppContextHost();

      await transaction.run(ctx, async () => {
        // TrxCtx is now defined — nested run should join
        const innerResult = await transaction.run(ctx, async () => 'inner');
        expect(innerResult).toBe('inner');
        return 'outer';
      });
    });

    it('should run lifecycle even without factories registered', async () => {
      const emptyRegistry = new TransactionFactoryRegistry();
      const moduleRef = await Test.createTestingModule({
        providers: [
          TransactionScope,
          {
            provide: TRANSACTION_FACTORY_REGISTRY,
            useValue: emptyRegistry,
          },
          {
            provide: REPOSITORY_MODULE_OPTIONS,
            useValue: { defaultTimeout: 30000 },
          },
        ],
      }).compile();

      const txScope = moduleRef.get<TransactionScope>(TransactionScope);
      const ctx = new AppContextHost();

      const operation = vi.fn().mockResolvedValue('result');
      const result = await txScope.run(ctx, operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should warn when no transaction factory is registered', async () => {
      const emptyRegistry = new TransactionFactoryRegistry();
      const moduleRef = await Test.createTestingModule({
        providers: [
          TransactionScope,
          {
            provide: TRANSACTION_FACTORY_REGISTRY,
            useValue: emptyRegistry,
          },
          {
            provide: REPOSITORY_MODULE_OPTIONS,
            useValue: { defaultTimeout: 30000 },
          },
        ],
      }).compile();

      const txScope = moduleRef.get<TransactionScope>(TransactionScope);
      const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

      txScope.onApplicationBootstrap();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain(
        'No transaction factory is registered',
      );

      warnSpy.mockRestore();
    });

    it('should not warn when a transaction factory is registered', () => {
      const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

      transaction.onApplicationBootstrap();

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should also warn from the first run() call, as a fallback for a boot-time warning that never reached its logger transport', async () => {
      const emptyRegistry = new TransactionFactoryRegistry();
      const moduleRef = await Test.createTestingModule({
        providers: [
          TransactionScope,
          {
            provide: TRANSACTION_FACTORY_REGISTRY,
            useValue: emptyRegistry,
          },
          {
            provide: REPOSITORY_MODULE_OPTIONS,
            useValue: { defaultTimeout: 30000 },
          },
        ],
      }).compile();

      const txScope = moduleRef.get<TransactionScope>(TransactionScope);
      const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

      // onApplicationBootstrap() deliberately not called — simulates a
      // logger transport not yet attached at boot.
      await txScope.run(new AppContextHost(), async () => 'result');
      await txScope.run(new AppContextHost(), async () => 'result');

      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });

  describe('commit and rollback lifecycle', () => {
    it('should commit active transactions on success', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        await txCtx.trx.getOrStart('typeorm:default');
        return 'result';
      });

      expect(mockTx.start).toHaveBeenCalledTimes(1);
      expect(mockTx.commit).toHaveBeenCalledTimes(1);
      expect(mockTx.rollback).not.toHaveBeenCalled();
    });

    it('should rollback all on error', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();
      const error = new Error('Operation failed');

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          throw error;
        }),
      ).rejects.toThrow(error);

      expect(mockTx.rollback).toHaveBeenCalledTimes(1);
    });

    it('should surface the operation error, not a rollback failure that happens while handling it', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });
      mockTx.rollback = vi
        .fn()
        .mockRejectedValue(new Error('connection dropped during rollback'));

      const ctx = new AppContextHost();
      const operationError = new Error('Operation failed');

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          throw operationError;
        }),
      ).rejects.toBe(operationError);
    });

    it('should surface the commit failure, not a rollback failure that happens while falling back from it', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });
      const commitError = new Error('commit failed');
      mockTx.commit = vi.fn().mockRejectedValue(commitError);
      mockTx.rollback = vi
        .fn()
        .mockRejectedValue(new Error('connection dropped during rollback'));

      const ctx = new AppContextHost();

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          return 'result';
        }),
      ).rejects.toBe(commitError);
    });

    it('should not roll back a transaction twice when the commit-failure fallback rollback already ran', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });
      const commitError = new Error('commit failed');
      mockTx.commit = vi.fn().mockRejectedValue(commitError);
      // Rejects without clearing isActive — unlike the default mock, whose
      // rollback always clears it — so a genuine second rollback attempt
      // stays visible here instead of being filtered out by isActive.
      mockTx.rollback = vi
        .fn()
        .mockRejectedValue(new Error('rollback also failed'));

      const ctx = new AppContextHost();

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          return 'result';
        }),
      ).rejects.toBe(commitError);

      expect(mockTx.rollback).toHaveBeenCalledTimes(1);
    });

    it('should release the scope even when the rollback reason is not an Error', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });
      mockTx.rollback = vi.fn().mockRejectedValue(Object.create(null));

      const ctx = new AppContextHost();
      const operationError = new Error('Operation failed');

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          throw operationError;
        }),
      ).rejects.toBe(operationError);

      expect(ctx.supports(TrxCtx)).toBe(false);
    });
  });

  describe('readOnly transactions', () => {
    it('should rollback on success when readOnly=true', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();

      await transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          return 'result';
        },
        { readOnly: true },
      );

      expect(mockTx.rollback).toHaveBeenCalledTimes(1);
      expect(mockTx.commit).not.toHaveBeenCalled();
    });

    it('runReadOnly should set readOnly=true', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();

      await transaction.runReadOnly(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          return 'result';
        },
      );

      expect(mockTx.rollback).toHaveBeenCalledTimes(1);
      expect(mockTx.commit).not.toHaveBeenCalled();
    });

    it('should flush onRollback callbacks after a successful readOnly run', async () => {
      const ctx = new AppContextHost();
      const rollbackCb = vi.fn();

      await transaction.runReadOnly(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          txCtx.trx.onRollback(rollbackCb);
          return 'result';
        },
      );

      expect(rollbackCb).toHaveBeenCalledTimes(1);
    });

    it('should not flush onCommit callbacks after a successful readOnly run', async () => {
      const ctx = new AppContextHost();
      const commitCb = vi.fn();

      await transaction.runReadOnly(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          txCtx.trx.onCommit(commitCb);
          return 'result';
        },
      );

      expect(commitCb).not.toHaveBeenCalled();
    });

    it('should flush onRollback callbacks exactly once when a readOnly run fails', async () => {
      const ctx = new AppContextHost();
      const rollbackCb = vi.fn();

      await expect(
        transaction.runReadOnly(
          ctx,
          async (txCtx: TransactionContextInterface) => {
            txCtx.trx.onRollback(rollbackCb);
            throw new Error('fail');
          },
        ),
      ).rejects.toThrow('fail');

      expect(rollbackCb).toHaveBeenCalledTimes(1);
    });

    it('should throw TransactionReadOnlyConflictException when a read-write run joins a readOnly scope', async () => {
      const ctx = new AppContextHost();

      await expect(
        transaction.runReadOnly(
          ctx,
          async (txCtx: TransactionContextInterface) => {
            return transaction.run(txCtx, async () => 'inner', {
              readOnly: false,
            });
          },
        ),
      ).rejects.toThrow(TransactionReadOnlyConflictException);
    });

    it('should throw TransactionReadOnlyConflictException when a runReadOnly joins a read-write scope', async () => {
      const ctx = new AppContextHost();

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          return transaction.runReadOnly(txCtx, async () => 'inner');
        }),
      ).rejects.toThrow(TransactionReadOnlyConflictException);
    });

    it('should join a readOnly scope silently when the joining run does not specify readOnly', async () => {
      const ctx = new AppContextHost();

      const result = await transaction.runReadOnly(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          return transaction.run(txCtx, async () => 'inner');
        },
      );

      expect(result).toBe('inner');
    });

    it('should join a read-write scope silently when the joining run does not specify readOnly', async () => {
      const ctx = new AppContextHost();

      const result = await transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          return transaction.run(txCtx, async () => 'inner');
        },
      );

      expect(result).toBe('inner');
    });

    it('should not corrupt the refcount when a conflicting join is rejected — the outer scope still settles once', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });
      const ctx = new AppContextHost();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        await txCtx.trx.getOrStart('typeorm:default');

        await expect(
          transaction.run(txCtx, async () => 'inner', { readOnly: true }),
        ).rejects.toThrow(TransactionReadOnlyConflictException);

        return 'outer';
      });

      expect(mockTx.commit).toHaveBeenCalledTimes(1);
      expect(mockTx.rollback).not.toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    it('should throw TransactionTimeoutException on timeout', async () => {
      const ctx = new AppContextHost();
      const operation = vi
        .fn()
        .mockImplementation(
          async () => new Promise((resolve) => setTimeout(resolve, 200)),
        );

      await expect(
        transaction.run(ctx, operation, { timeout: 50 }),
      ).rejects.toThrow(TransactionTimeoutException);
    });

    it('should abort the signal with a TransactionTimeoutException on timeout', async () => {
      const ctx = new AppContextHost();
      let signal: AbortSignal | undefined;

      const operation = vi
        .fn()
        .mockImplementation(async (txCtx: TransactionContextInterface) => {
          signal = txCtx.trx.signal;
          return new Promise((resolve) => setTimeout(resolve, 200));
        });

      await expect(
        transaction.run(ctx, operation, { timeout: 50 }),
      ).rejects.toThrow(TransactionTimeoutException);

      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toBeInstanceOf(TransactionTimeoutException);
    });

    it('should log rather than swallow an operation that rejects after its transaction timed out', async () => {
      const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});
      const ctx = new AppContextHost();
      let releaseOrphan: (() => void) | undefined;
      const orphanError = new Error('orphan failure');

      const operation = vi.fn().mockImplementation(async () => {
        await new Promise<void>((resolve) => {
          releaseOrphan = resolve;
        });
        throw orphanError;
      });

      await expect(
        transaction.run(ctx, operation, { timeout: 50 }),
      ).rejects.toThrow(TransactionTimeoutException);

      expect(releaseOrphan).toBeDefined();
      releaseOrphan?.();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('orphan failure'),
        expect.any(String),
      );

      errorSpy.mockRestore();
    });
  });

  describe('settling immediately on timeout, without waiting for other participants', () => {
    it('should release TrxCtx as soon as the timeout fires, before a still-running nested participant exits', async () => {
      const ctx = new AppContextHost();
      let releaseNested: (() => void) | undefined;

      const outerRun = transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          return transaction.run(txCtx, async () => {
            await new Promise<void>((resolve) => {
              releaseNested = resolve;
            });
            return 'nested';
          });
        },
        { timeout: 50 },
      );

      await expect(outerRun).rejects.toThrow(TransactionTimeoutException);

      expect(ctx.supports(TrxCtx)).toBe(false);

      releaseNested?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('should have rolled back the started transaction by the time the timeout rejects, without waiting for the still-running nested participant', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();
      let releaseNested: (() => void) | undefined;

      const outerRun = transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          return transaction.run(
            txCtx,
            async (nestedTxCtx: TransactionContextInterface) => {
              await nestedTxCtx.trx.getOrStart('typeorm:default');
              await new Promise<void>((resolve) => {
                releaseNested = resolve;
              });
              return 'nested';
            },
          );
        },
        { timeout: 50 },
      );

      await expect(outerRun).rejects.toThrow(TransactionTimeoutException);

      expect(mockTx.rollback).toHaveBeenCalledTimes(1);

      // The nested participant later exiting must not roll back a second time.
      releaseNested?.();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockTx.rollback).toHaveBeenCalledTimes(1);
    });

    it('should let a run() retried on the same ctx immediately after a timeout start its own fresh scope, not join the doomed one', async () => {
      const created: TransactionInterface[] = [];
      mockRegistry.register('typeorm:default', {
        create: () => {
          const tx = createMockTransaction();
          created.push(tx);
          return tx;
        },
      });

      const ctx = new AppContextHost();
      let releaseNested: (() => void) | undefined;

      const outerRun = transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          return transaction.run(
            txCtx,
            async (nestedTxCtx: TransactionContextInterface) => {
              await nestedTxCtx.trx.getOrStart('typeorm:default');
              await new Promise<void>((resolve) => {
                releaseNested = resolve;
              });
              return 'nested';
            },
          );
        },
        { timeout: 50 },
      );

      await expect(outerRun).rejects.toThrow(TransactionTimeoutException);

      const retryResult = await transaction.run(
        ctx,
        async (retryTxCtx: TransactionContextInterface) => {
          await retryTxCtx.trx.getOrStart('typeorm:default');
          return 'retried';
        },
      );

      expect(retryResult).toBe('retried');
      expect(created).toHaveLength(2);
      expect(created[1].commit).toHaveBeenCalledTimes(1);
      expect(created[1].rollback).not.toHaveBeenCalled();

      releaseNested?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('should not be pinned forever by an orphan that never resolves', async () => {
      const ctx = new AppContextHost();

      const outerRun = transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          return transaction.run(txCtx, async () => {
            // Never resolves — simulates a hung operation (dead connection,
            // stuck lock wait) that outlives the timeout and keeps running.
            return new Promise(() => {});
          });
        },
        { timeout: 50 },
      );

      await expect(outerRun).rejects.toThrow(TransactionTimeoutException);

      const result = await transaction.run(ctx, async () => 'fresh');
      expect(result).toBe('fresh');
    });
  });

  describe('trx.signal', () => {
    it('should not abort the signal when the operation succeeds', async () => {
      const ctx = new AppContextHost();
      let signal: AbortSignal | undefined;

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        signal = txCtx.trx.signal;
        return 'result';
      });

      expect(signal?.aborted).toBe(false);
    });

    it('should abort the signal with the thrown error when the operation fails', async () => {
      const ctx = new AppContextHost();
      let signal: AbortSignal | undefined;
      const operationError = new Error('operation failed');

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          signal = txCtx.trx.signal;
          throw operationError;
        }),
      ).rejects.toBe(operationError);

      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toBe(operationError);
    });

    it('should abort the signal shared with the outer scope when a nested run fails', async () => {
      const ctx = new AppContextHost();
      let outerSignal: AbortSignal | undefined;
      const innerError = new Error('inner failed');

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          outerSignal = txCtx.trx.signal;

          await expect(
            transaction.run(ctx, async () => {
              throw innerError;
            }),
          ).rejects.toBe(innerError);

          expect(outerSignal?.aborted).toBe(true);
          expect(outerSignal?.reason).toBe(innerError);

          // The outer's own operation "succeeds" from here — it caught
          // the nested failure — but the scope they share is doomed.
          return 'outer';
        }),
      ).rejects.toThrow(TransactionScopeFailedException);
    });
  });

  describe('rejecting a participant whose shared scope already failed', () => {
    it('should carry the failure that doomed the scope as originalError', async () => {
      const ctx = new AppContextHost();
      const innerError = new Error('inner failed');
      let caught: unknown;

      try {
        await transaction.run(
          ctx,
          async (txCtx: TransactionContextInterface) => {
            await expect(
              transaction.run(txCtx, async () => {
                throw innerError;
              }),
            ).rejects.toBe(innerError);

            return 'outer';
          },
        );
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(TransactionScopeFailedException);
      const exception = caught as TransactionScopeFailedException;
      expect(exception.context.originalError).toBe(innerError);
    });

    it('should reject the other side of a concurrent pair when its sibling fails', async () => {
      const ctx = new AppContextHost();
      const siblingError = new Error('sibling failed');

      const failing = transaction.run(ctx, async () => {
        throw siblingError;
      });
      const succeeding = transaction.run(ctx, async () => 'ok');

      const [failingResult, succeedingResult] = await Promise.allSettled([
        failing,
        succeeding,
      ]);

      expect(failingResult).toEqual({
        status: 'rejected',
        reason: siblingError,
      });
      expect(succeedingResult.status).toBe('rejected');
      expect(
        succeedingResult.status === 'rejected'
          ? succeedingResult.reason
          : undefined,
      ).toBeInstanceOf(TransactionScopeFailedException);
    });

    it('should not flush onCommit callbacks registered by a participant whose scope already failed', async () => {
      const ctx = new AppContextHost();
      const commitCb = vi.fn();
      const innerError = new Error('inner failed');

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          txCtx.trx.onCommit(commitCb);

          await expect(
            transaction.run(txCtx, async () => {
              throw innerError;
            }),
          ).rejects.toBe(innerError);

          return 'outer';
        }),
      ).rejects.toThrow(TransactionScopeFailedException);

      expect(commitCb).not.toHaveBeenCalled();
    });

    it("should still surface a participant's own thrown error, unwrapped, when that participant is the one that failed", async () => {
      const ctx = new AppContextHost();
      const error = new Error('own failure');

      await expect(
        transaction.run(ctx, async () => {
          throw error;
        }),
      ).rejects.toBe(error);
    });
  });

  describe('onCommit / onRollback callbacks', () => {
    it('should flush onCommit callbacks after successful commit', async () => {
      const ctx = new AppContextHost();
      const callback = vi.fn();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        txCtx.trx.onCommit(callback);
        return 'result';
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should flush onRollback callbacks after error rollback', async () => {
      const ctx = new AppContextHost();
      const callback = vi.fn();

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          txCtx.trx.onRollback(callback);
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not flush onCommit callbacks on rollback', async () => {
      const ctx = new AppContextHost();
      const commitCb = vi.fn();

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          txCtx.trx.onCommit(commitCb);
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');

      expect(commitCb).not.toHaveBeenCalled();
    });

    it('should not flush onRollback callbacks on commit', async () => {
      const ctx = new AppContextHost();
      const rollbackCb = vi.fn();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        txCtx.trx.onRollback(rollbackCb);
        return 'result';
      });

      expect(rollbackCb).not.toHaveBeenCalled();
    });

    it('should accumulate callbacks from nested runs and flush at outermost', async () => {
      const ctx = new AppContextHost();
      const order: number[] = [];

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        txCtx.trx.onCommit(() => {
          order.push(1);
        });

        await transaction.run(
          ctx,
          async (innerTxCtx: TransactionContextInterface) => {
            innerTxCtx.trx.onCommit(() => {
              order.push(2);
            });
            return 'inner';
          },
        );

        txCtx.trx.onCommit(() => {
          order.push(3);
        });
        return 'outer';
      });

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('settling against the scope creator, not the last exiter (#468)', () => {
    it('should release TrxCtx from the original ctx when a timed-out outer exits before its still-running nested participant', async () => {
      const ctx = new AppContextHost();
      let releaseNested: (() => void) | undefined;

      const outerRun = transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          // Nested run — created inside the outer operation, so it shares
          // the outer's scope and outlives the outer's timeout.
          return transaction.run(txCtx, async () => {
            await new Promise<void>((resolve) => {
              releaseNested = resolve;
            });
            return 'nested';
          });
        },
        { timeout: 50 },
      );

      await expect(outerRun).rejects.toThrow(TransactionTimeoutException);

      // The outer exited (to depth 1, not 0) without settling — the
      // nested participant is still running and still holds the scope.
      expect(releaseNested).toBeDefined();
      releaseNested?.();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Now that the nested participant has exited too (to depth 0), the
      // scope must have settled against ctx — the host that created it —
      // not against the nested participant's own run-scoped child.
      expect(ctx.supports(TrxCtx)).toBe(false);

      // And a fresh run() on the same ctx must succeed rather than seeing
      // a stale, already-closed TransactionManager.
      const result = await transaction.run(ctx, async () => 'fresh');
      expect(result).toBe('fresh');
    });
  });

  describe('closing before settling, not after', () => {
    it('should already be closed by the time commitAll() starts committing', async () => {
      const mockTx = createMockTransaction();
      let capturedTxCtx: TransactionContextInterface | undefined;
      let closedDuringCommit: boolean | undefined;
      mockTx.commit = vi.fn().mockImplementation(async () => {
        closedDuringCommit = capturedTxCtx?.trx.isClosed;
      });
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        capturedTxCtx = txCtx;
        await txCtx.trx.getOrStart('typeorm:default');
        return 'result';
      });

      expect(closedDuringCommit).toBe(true);
    });

    it('should reject a getOrStart() call for a new key made from within commit(), rather than let it start an orphaned transaction', async () => {
      const mockTx = createMockTransaction();
      const otherTx = createMockTransaction();
      let capturedTxCtx: TransactionContextInterface | undefined;
      let getOrStartDuringCommit: Promise<TransactionInterface> | undefined;
      mockTx.commit = vi.fn().mockImplementation(async () => {
        getOrStartDuringCommit = capturedTxCtx?.trx.getOrStart('typeorm:other');
      });
      mockRegistry.register('typeorm:default', { create: () => mockTx });
      mockRegistry.register('typeorm:other', { create: () => otherTx });

      const ctx = new AppContextHost();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        capturedTxCtx = txCtx;
        await txCtx.trx.getOrStart('typeorm:default');
        return 'result';
      });

      await expect(getOrStartDuringCommit).rejects.toThrow(
        TransactionClosedException,
      );
      expect(otherTx.start).not.toHaveBeenCalled();
    });

    it('should throw TransactionClosedException rather than re-settle when run() is called again with a stale, already-closed txCtx', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();
      let capturedTxCtx: TransactionContextInterface | undefined;

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        capturedTxCtx = txCtx;
        await txCtx.trx.getOrStart('typeorm:default');
      });

      expect(mockTx.commit).toHaveBeenCalledTimes(1);

      const staleOperation = vi.fn().mockResolvedValue('noop');

      await expect(
        transaction.run(
          capturedTxCtx as TransactionContextInterface,
          staleOperation,
        ),
      ).rejects.toThrow(TransactionClosedException);

      // enter() must reject before the stale participant's operation ever
      // runs — not merely before the scope re-settles.
      expect(staleOperation).not.toHaveBeenCalled();
    });
  });

  describe('nested run() calls', () => {
    it('should not double commit on nested run', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        await txCtx.trx.getOrStart('typeorm:default');

        // Nested run — should just execute, no lifecycle ownership
        await transaction.run(ctx, async () => 'inner');

        return 'outer';
      });

      // Only committed once by outermost
      expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });

    it('should propagate error from nested run to outermost', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();
      const error = new Error('inner failure');

      await expect(
        transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');

          await transaction.run(ctx, async () => {
            throw error;
          });

          return 'outer';
        }),
      ).rejects.toThrow(error);

      expect(mockTx.rollback).toHaveBeenCalledTimes(1);
    });
  });

  describe('sequential and concurrent run() on the same context (#468)', () => {
    it('should give each sequential run its own transaction, started and committed once', async () => {
      const created: TransactionInterface[] = [];
      mockRegistry.register('typeorm:default', {
        create: () => {
          const tx = createMockTransaction();
          created.push(tx);
          return tx;
        },
      });

      const ctx = new AppContextHost();

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        await txCtx.trx.getOrStart('typeorm:default');
      });

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        await txCtx.trx.getOrStart('typeorm:default');
      });

      expect(created).toHaveLength(2);
      expect(created[0]).not.toBe(created[1]);
      expect(created[0].commit).toHaveBeenCalledTimes(1);
      expect(created[1].commit).toHaveBeenCalledTimes(1);
    });

    it('should clear supports(TrxCtx) after a successful run and after a throwing run', async () => {
      const ctx = new AppContextHost();

      await transaction.run(ctx, async () => 'ok');
      expect(ctx.supports(TrxCtx)).toBe(false);

      await expect(
        transaction.run(ctx, async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');
      expect(ctx.supports(TrxCtx)).toBe(false);
    });

    it('should not clear supports(TrxCtx) for a nested run — only the outermost settles it', async () => {
      const ctx = new AppContextHost();

      await transaction.run(ctx, async () => {
        await transaction.run(ctx, async () => 'inner');

        // Still inside the outer operation — the scope must still be live.
        expect(ctx.supports(TrxCtx)).toBe(true);

        return 'outer';
      });

      expect(ctx.supports(TrxCtx)).toBe(false);
    });

    it('should share one transaction across concurrent runs and commit once, after both resolve', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();

      const slow = transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'slow';
        },
      );

      const fast = transaction.run(
        ctx,
        async (txCtx: TransactionContextInterface) => {
          await txCtx.trx.getOrStart('typeorm:default');
          // The slow run is still in flight — nobody should have settled yet.
          expect(mockTx.commit).not.toHaveBeenCalled();
          return 'fast';
        },
      );

      const [slowResult, fastResult] = await Promise.all([slow, fast]);

      expect(slowResult).toBe('slow');
      expect(fastResult).toBe('fast');
      expect(mockTx.commit).toHaveBeenCalledTimes(1);
      expect(ctx.supports(TrxCtx)).toBe(false);
    });

    it('should have removed TrxCtx from ctx by the time onCommit callbacks run', async () => {
      const ctx = new AppContextHost();
      let sawDuringCallback: boolean | undefined;

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        txCtx.trx.onCommit(() => {
          sawDuringCallback = ctx.supports(TrxCtx);
        });
      });

      expect(sawDuringCallback).toBe(false);
    });

    it('should keep the run-scoped child resolving TrxCtx after the scope closes, and fail loudly on reuse', async () => {
      const mockTx = createMockTransaction();
      mockRegistry.register('typeorm:default', { create: () => mockTx });

      const ctx = new AppContextHost();
      let capturedTxCtx: TransactionContextInterface | undefined;

      await transaction.run(ctx, async (txCtx: TransactionContextInterface) => {
        capturedTxCtx = txCtx;
      });

      expect(capturedTxCtx).toBeDefined();
      const childHost = AppContextHost.from(
        capturedTxCtx as TransactionContextInterface,
      );

      // The parent ctx released the scope...
      expect(ctx.supports(TrxCtx)).toBe(false);
      // ...but a handle still held by orphaned code keeps resolving it,
      // rather than silently falling through to non-transactional access.
      expect(childHost.supports(TrxCtx)).toBe(true);

      await expect(
        (capturedTxCtx as TransactionContextInterface).trx.getOrStart(
          'typeorm:default',
        ),
      ).rejects.toThrow(TransactionClosedException);
    });
  });
});
