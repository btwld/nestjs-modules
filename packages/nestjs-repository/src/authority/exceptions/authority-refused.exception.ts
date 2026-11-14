import { HttpStatus } from '@nestjs/common';

import {
  normalizeActor,
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { type AuthorityRefusedDetailsInterface } from './authority-refused-details.interface.js';

/**
 * Exception thrown when the authority governing an entity refuses the
 * caller's action, or a column it names, or the call names no actor.
 *
 * The message names the action and the entity key only. Why it was refused
 * (`refusal`), who asked (`actor`), the columns refused and any pending
 * decision (`gate`) stay in the context for logs.
 */
export class AuthorityRefusedException extends RuntimeException {
  declare context: RuntimeException['context'] &
    AuthorityRefusedDetailsInterface & {
      entityKey: string;
      action: string;
    };

  constructor(
    entityKey: string,
    action: string,
    details: AuthorityRefusedDetailsInterface,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Not allowed to %s %s',
      messageParams: [action, entityKey],
      httpStatus: HttpStatus.FORBIDDEN,
      fault: 'client',
      ...options,
    });

    this.context = {
      ...this.context,
      entityKey,
      action,
      refusal: details.refusal,
      ...(details.actor === undefined
        ? {}
        : { actor: normalizeActor(details.actor) }),
      ...(details.gate === undefined ? {} : { gate: details.gate }),
      ...(details.columns === undefined ? {} : { columns: details.columns }),
    };
    this.errorCode = 'AUTHORITY_REFUSED';
  }
}
