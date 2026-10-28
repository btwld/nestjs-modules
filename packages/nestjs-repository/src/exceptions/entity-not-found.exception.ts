import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a write names a row that is no longer stored, such as
 * an `update` of a row another caller deleted after it was read.
 *
 * Thrown by a repository driver, which is the one to find the row missing.
 */
export class EntityNotFoundException extends RuntimeException {
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
      message: 'Cannot %s %s: the record no longer exists',
      messageParams: [operation, entityName],
      httpStatus: HttpStatus.NOT_FOUND,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName, operation };
    this.errorCode = 'ENTITY_NOT_FOUND';
  }
}
