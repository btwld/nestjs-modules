import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an operation would change a row on an entity declared
 * `append-only`.
 *
 * There is deliberately no `force` escape hatch, unlike the soft-delete
 * immutability guard. An escape hatch is the failure mode the declaration
 * exists to prevent: the value of "this row never changes" is that a reader
 * can rely on it without auditing every call site. Data migration and
 * backfill run outside the repository layer, the same place direct
 * `@InjectRepository` writes do.
 *
 * To correct an append-only record, append a new one that references it.
 */
export class AppendOnlyViolationException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    operation: string;
  };

  constructor(
    entityName: string,
    operation: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Cannot %s %s: it is declared append-only, so a stored row can never ' +
        'change. Append a new record that references the original instead',
      messageParams: [operation, entityName],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityName, operation };
    this.errorCode = 'APPEND_ONLY_VIOLATION';
  }
}
