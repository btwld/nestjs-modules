import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a `run()` call joins an existing transaction scope
 * with a `readOnly` option that conflicts with the scope it's joining.
 *
 * `readOnly` is decided once, by whichever `run()` created the scope —
 * every later participant just joins it. Silently ignoring a conflicting
 * `readOnly` would either roll back writes the caller expected to persist,
 * or let a `runReadOnly()` call's "must not persist" guarantee be silently
 * dropped, in each case without any error to explain why.
 */
export class TransactionReadOnlyConflictException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message:
        'run() was called with a readOnly option that conflicts with the transaction scope it joined',
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'TRANSACTION_READ_ONLY_CONFLICT';
  }
}
