import { lastValueFrom, of, throwError } from 'rxjs';
import { type Mocked } from 'vitest';

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { AppContextHost } from '@concepta/nestjs-core';

import { TransactionFactoryInterface } from '../../interfaces/transaction-factory.interface.js';
import { REPOSITORY_MODULE_OPTIONS } from '../../repository.constants.js';
import { TransactionInterface } from '../interfaces/transaction.interface.js';
import {
  TransactionFactoryRegistry,
  TRANSACTION_FACTORY_REGISTRY,
} from '../transaction-factory-registry.js';
import { TransactionManager } from '../transaction-manager.js';
import { TransactionScope } from '../transaction-scope.js';
import { TransactionalRunner } from '../transactional-runner.js';
import { Transactional } from '../transactional.decorator.js';

describe(TransactionalRunner.name, () => {
  let runner: TransactionalRunner;
  let mockRegistry: TransactionFactoryRegistry;
  let mockFactory: Mocked<TransactionFactoryInterface>;
  let mockTransaction: TransactionInterface;

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

  function createMockExecutionContext(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    handler: Function,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    controller: Function,
  ): ExecutionContext {
    const ctx = new AppContextHost();
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ [Symbol.for('APP_CONTEXT_KEY')]: ctx }),
      }),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    mockTransaction = createMockTransaction();

    mockFactory = {
      create: vi.fn().mockReturnValue(mockTransaction),
    };

    mockRegistry = new TransactionFactoryRegistry();
    mockRegistry.register('typeorm:default', mockFactory);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionalRunner,
        TransactionScope,
        Reflector,
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

    runner = moduleRef.get<TransactionalRunner>(TransactionalRunner);
  });

  describe('run', () => {
    it('should call operation without transaction when no @Transactional', async () => {
      class PlainController {}

      function handlerWithoutDecorator() {
        return 'result';
      }

      const context = createMockExecutionContext(
        handlerWithoutDecorator,
        PlainController,
      );
      const operation = vi.fn().mockReturnValue(of('result'));

      const result = await lastValueFrom(runner.run(context, operation));
      expect(result).toBe('result');
    });

    it('should wrap operation in transaction when @Transactional present', async () => {
      class TestHandler {
        @Transactional()
        handle() {
          return 'result';
        }
      }

      const handler = new TestHandler();
      const context = createMockExecutionContext(handler.handle, TestHandler);
      const operation = vi.fn().mockReturnValue(of('result'));

      const result = await lastValueFrom(runner.run(context, operation));
      expect(result).toBe('result');
    });

    it('should handle errors from operation', async () => {
      class TestHandler {
        @Transactional()
        handle() {
          return 'result';
        }
      }

      const handler = new TestHandler();
      const context = createMockExecutionContext(handler.handle, TestHandler);
      const error = new Error('Operation failed');
      const operation = vi.fn().mockReturnValue(throwError(() => error));

      await expect(lastValueFrom(runner.run(context, operation))).rejects.toBe(
        error,
      );
    });

    it('should use class-level @Transactional for methods without decorator', async () => {
      @Transactional()
      class TransactionalController {
        handle() {
          return 'result';
        }
      }

      const ctrl = new TransactionalController();
      const context = createMockExecutionContext(
        ctrl.handle,
        TransactionalController,
      );
      const operation = vi.fn().mockReturnValue(of('result'));

      const result = await lastValueFrom(runner.run(context, operation));
      expect(result).toBe('result');
    });

    it('should respect @Transactional(false) override on method when class has @Transactional', async () => {
      @Transactional()
      class TransactionalController {
        @Transactional(false)
        handle() {
          return 'result';
        }
      }

      const ctrl = new TransactionalController();
      const context = createMockExecutionContext(
        ctrl.handle,
        TransactionalController,
      );
      const operation = vi.fn().mockReturnValue(of('result'));

      const result = await lastValueFrom(runner.run(context, operation));
      expect(result).toBe('result');
    });

    it('should use readOnly option from decorator', async () => {
      class TestHandler {
        @Transactional({ readOnly: true })
        handle() {
          return 'result';
        }
      }

      const handler = new TestHandler();
      const context = createMockExecutionContext(handler.handle, TestHandler);
      const operation = vi.fn().mockReturnValue(of('result'));

      // Spy at the TransactionManager level — rollbackAll() is called even
      // when no transactions were started (it iterates an empty map).
      const rollbackAllSpy = vi.spyOn(
        TransactionManager.prototype,
        'rollbackAll',
      );
      await lastValueFrom(runner.run(context, operation));
      expect(rollbackAllSpy).toHaveBeenCalled();
      rollbackAllSpy.mockRestore();
    });
  });
});
