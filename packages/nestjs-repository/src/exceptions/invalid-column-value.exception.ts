import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a write payload gives a column a value a driver could
 * act on rather than store: a function, which it may run as raw SQL, or an
 * object in a key column, which it may read as the related row.
 */
export class InvalidColumnValueException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    properties: string[];
  };

  constructor(
    entityName: string,
    properties: string[],
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Cannot write %s: %s must be a plain value — never a function, and ' +
        'for a key column never an object',
      messageParams: [entityName, properties.join(', ')],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName, properties };
    this.errorCode = 'INVALID_COLUMN_VALUE';
  }
}
