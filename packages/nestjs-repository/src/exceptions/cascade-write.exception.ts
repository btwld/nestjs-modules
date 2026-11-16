import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a cascade relation in a write payload holds something
 * other than the related rows: a list of objects for a to-many relation, an
 * object or `null` for a to-one.
 */
export class CascadeWriteException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    relation: string;
  };

  constructor(
    entityName: string,
    relation: string,
    expected: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Cannot write %s.%s — expected %s',
      messageParams: [entityName, relation, expected],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName, relation };
    this.errorCode = 'CASCADE_WRITE_REFUSED';
  }
}
