import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when the authority governing an entity refuses the
 * caller's action, or a column it names, or the call names no actor.
 *
 * The message names the action and the entity only: who asked, the columns
 * refused, and any pending decision (`gate`) stay in the context for logs.
 */
export class AuthorityRefusedException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    action: string;
    gate?: string;
    columns?: string[];
  };

  constructor(
    entityName: string,
    action: string,
    details: { gate?: string; columns?: string[] } = {},
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Not allowed to %s %s',
      messageParams: [action, entityName],
      httpStatus: HttpStatus.FORBIDDEN,
      fault: 'client',
      ...options,
    });

    this.context = {
      ...this.context,
      entityName,
      action,
      ...(details.gate === undefined ? {} : { gate: details.gate }),
      ...(details.columns === undefined ? {} : { columns: details.columns }),
    };
    this.errorCode = 'AUTHORITY_REFUSED';
  }
}
