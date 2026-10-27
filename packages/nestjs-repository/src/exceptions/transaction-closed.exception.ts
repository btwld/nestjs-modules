import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a transaction scope is accessed after it has
 * already settled (committed or rolled back).
 */
export class TransactionClosedException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Transaction scope is closed and can no longer be used',
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'TRANSACTION_CLOSED';
  }
}
