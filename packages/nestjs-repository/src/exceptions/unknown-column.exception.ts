import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a write payload, or a read's select, filter or sort,
 * names a property that is not one of the entity's own columns.
 *
 * Only the entity's own columns reach the driver, so nothing a driver might
 * make of another property can write or read past the repository's checks.
 */
export class UnknownColumnException extends RuntimeException {
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
        'Cannot write %s — not a property of this entity: %s. Send only ' +
        'its own column properties, and relations by their property name',
      messageParams: [entityName, properties.join(', ')],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName, properties };
    this.errorCode = 'UNKNOWN_COLUMN';
  }
}
