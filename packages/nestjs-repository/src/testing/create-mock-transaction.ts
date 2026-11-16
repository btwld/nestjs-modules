import { type Mock } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { AppContextHost } from '@concepta/nestjs-core';

import { TrxCtx } from '../transaction/interfaces/transaction-context.interface.js';
import { type TransactionManager } from '../transaction/transaction-manager.js';
import { type TransactionScope } from '../transaction/transaction-scope.js';

export interface MockTransactionHandle {
  onCommit: Mock;
  onRollback: Mock;
}

/**
 * Create a mock TransactionScope for unit testing.
 *
 * The `run` mock immediately invokes the callback with a mock
 * `TransactionContextInterface` backed by a real `AppContextHost`
 * so that nested `AppContextHost.from()` calls work correctly.
 */
export function createMockTransaction(): {
  transaction: DeepMockProxy<TransactionScope>;
  trxHandle: MockTransactionHandle;
} {
  const trx = mockDeep<TransactionManager>();
  const trxHandle: MockTransactionHandle = {
    onCommit: trx.onCommit,
    onRollback: trx.onRollback,
  };

  const mockHost = new AppContextHost();
  mockHost.defineOverlay(TrxCtx, { trx });
  const mockTxCtx = mockHost.with(TrxCtx);

  const transaction = mockDeep<TransactionScope>();
  transaction.run.mockImplementation((_ctx, fn) => fn(mockTxCtx));

  return { transaction, trxHandle };
}
