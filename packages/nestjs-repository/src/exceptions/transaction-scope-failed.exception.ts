import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown from a `run()` call whose own operation succeeded, but
 * whose shared transaction scope had already failed by the time it exited.
 *
 * Participants share one scope, refcounted via `enter()`/`exit()` — only
 * the last one to exit actually commits or rolls back. Without this, a
 * caller that catches a sibling `run()`'s error (nested or concurrent)
 * would see its own `run()` resolve successfully for a unit of work the
 * scope discarded underneath it, with `onCommit` never firing and nothing
 * to explain why.
 *
 * Carries the failure that doomed the scope — usually the sibling's thrown
 * error, or a commit failure — as `context.originalError` / `cause`.
 */
export class TransactionScopeFailedException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message:
        'run() succeeded, but its shared transaction scope had already failed and rolled back',
      fault: 'internal',
      ...options,
    });

    this.errorCode = 'TRANSACTION_SCOPE_FAILED';
  }
}
