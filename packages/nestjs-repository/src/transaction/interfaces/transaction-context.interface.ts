import { type PlainLiteralObject } from '@nestjs/common';

import { OverlayRef } from '@concepta/nestjs-core';

import { type TransactionManager } from '../transaction-manager.js';

/**
 * Context interface for the transaction overlay.
 *
 * Returned by the `withTrx()` overlay method. Provides access
 * to the {@link TransactionManager} for the current scope.
 */
export interface TransactionContextInterface extends PlainLiteralObject {
  trx: TransactionManager;
}

export const TrxCtx = new OverlayRef<'withTrx', TransactionContextInterface>(
  'withTrx',
);
