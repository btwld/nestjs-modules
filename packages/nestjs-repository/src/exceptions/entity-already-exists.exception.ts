import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when `create` or `createMany` is given a primary key that
 * already names a row.
 *
 * A create inserts; it never updates. Without this guard a driver that
 * implements create as a save-by-primary-key would silently overwrite the row
 * that key names — and no permission check above the repository can see that
 * happen, because it looks like an insert on the way in. Use `upsert` for
 * insert-or-update.
 */
export class EntityAlreadyExistsException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Cannot create %s: a record with that primary key already exists — ' +
        'use upsert() to insert or update',
      messageParams: [entityName],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName };
    this.errorCode = 'ENTITY_ALREADY_EXISTS';
  }
}
