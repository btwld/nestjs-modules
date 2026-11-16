import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a repository call joins a transaction scope that
 * has already failed: a participant's operation threw, or the database
 * ended the scope's transaction, such as on a deadlock. The scope will roll
 * back, so nothing more runs in it.
 *
 * Carries the failure that doomed the scope as `context.originalError` /
 * `cause`.
 */
export class TransactionDoomedException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message:
        'The transaction scope has failed and will roll back, so nothing more can run in it',
      fault: 'internal',
      ...options,
    });

    this.errorCode = 'TRANSACTION_DOOMED';
  }
}
