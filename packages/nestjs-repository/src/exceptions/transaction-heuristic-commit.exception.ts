import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a multi-datasource commit fails after at least one
 * datasource has already committed. Without real two-phase commit, that
 * earlier commit cannot be undone — the outcome is "heuristic"
 * (mixed/undetermined) rather than atomic across datasources.
 *
 * Not thrown when nothing had committed yet — rolling everything back is
 * then a clean, atomic outcome, and the raw underlying error is thrown
 * instead, however many datasources were involved.
 */
export class TransactionHeuristicCommitException extends RuntimeException {
  constructor(
    committedCount: number,
    rolledBackCount: number,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Heuristic commit failure: %d of %d datasource transactions committed before a failure; the remaining %d were rolled back and cannot be committed',
      messageParams: [
        committedCount,
        committedCount + rolledBackCount,
        rolledBackCount,
      ],
      fault: 'internal',
      ...options,
    });

    this.errorCode = 'TRANSACTION_HEURISTIC_COMMIT';
  }
}
