import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a `create` supplies only part of a composite primary
 * key.
 *
 * A partial key cannot identify a row, so nothing can check whether it is
 * already taken, and a driver implementing create as a save-by-key fails
 * reporting that it cannot *update* a row — for a call the caller made to
 * `create`, naming no column. Refusing here says which columns are missing.
 *
 * Supplying none of the key columns is a different case and is allowed: that
 * is the ordinary generated-key create.
 */
export class PartialPrimaryKeyException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    missing: string[];
  };

  constructor(
    entityName: string,
    missing: string[],
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Cannot create %s from a partial primary key (missing: %s) — supply ' +
        'every primary key column, or none of them for a generated key',
      messageParams: [entityName, missing.join(', ')],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName, missing };
    this.errorCode = 'PARTIAL_PRIMARY_KEY';
  }
}
