import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when `update` or `replace` is given data that would change
 * the primary key of the entity it was called on.
 *
 * Both take the row to write as their first argument; `data` supplies field
 * values, not a target. A primary key in `data` would otherwise decide the row
 * instead, so the write would land somewhere the caller never named while the
 * entity they passed was left untouched. Delete and create to move a record to
 * a new key.
 */
export class PrimaryKeyImmutableException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    columns: string[];
  };

  constructor(
    entityName: string,
    columns: string[],
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Cannot change the primary key of %s via update or replace ' +
        '(column(s): %s) — the entity argument names the row to write',
      messageParams: [entityName, columns.join(', ')],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName, columns };
    this.errorCode = 'PRIMARY_KEY_IMMUTABLE';
  }
}
