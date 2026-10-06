import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when an update/replace targets a stale version of an
 * entity — the row was modified by another request since it was read.
 */
export class OptimisticLockException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Update conflict on %s: the record was modified by another request',
      messageParams: [entityName],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName };
    this.errorCode = 'OPTIMISTIC_LOCK_CONFLICT';
  }
}
