import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a transaction times out.
 */
export class TransactionTimeoutException extends RuntimeException {
  constructor(timeoutMs: number, options?: RuntimeExceptionOptions) {
    super({
      message: 'Transaction timeout after %dms',
      messageParams: [timeoutMs],
      fault: 'internal',
      ...options,
    });

    this.errorCode = 'TRANSACTION_TIMEOUT';
  }
}
