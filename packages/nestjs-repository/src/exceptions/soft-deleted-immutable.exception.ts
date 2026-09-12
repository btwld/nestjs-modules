import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an update, replace, or upsert targets a row that is
 * currently soft-deleted — soft-deleted rows are immutable everywhere except
 * through `restore()`. Pass `{ force: true }` to the write call to bypass
 * this guard for server-side carve-outs (e.g. pre-purge PII masking, admin
 * data-integrity corrections).
 */
export class SoftDeletedImmutableException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Cannot mutate %s: the record is soft-deleted — restore it first, ' +
        'or pass { force: true } to bypass this guard',
      messageParams: [entityName],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName };
    this.errorCode = 'SOFT_DELETED_IMMUTABLE';
  }
}
