import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '../../exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../exceptions/runtime.exception.js';
import { type AuthorityActionRefusedDetailsInterface } from '../interfaces/authority-action-refused-details.interface.js';
import { normalizeActor } from '../utils/normalize-actor.util.js';

/**
 * Thrown by `assertAuthority` when the authority refuses the actor the
 * action on the subject, or nobody is acting.
 *
 * The message names the action and the subject only. Why it was refused
 * (`refusal`), who asked (`actor`) and any decision still pending (`gate`)
 * stay in the context, for logs.
 */
export class AuthorityActionRefusedException extends RuntimeException {
  declare context: RuntimeException['context'] &
    AuthorityActionRefusedDetailsInterface & {
      subject: string;
      action: string;
    };

  constructor(
    subject: string,
    action: string,
    details: AuthorityActionRefusedDetailsInterface,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Not allowed to %s %s',
      messageParams: [action, subject],
      httpStatus: HttpStatus.FORBIDDEN,
      fault: 'client',
      ...options,
    });

    this.context = {
      ...this.context,
      subject,
      action,
      refusal: details.refusal,
      ...(details.actor === undefined
        ? {}
        : { actor: normalizeActor(details.actor) }),
      ...(details.gate === undefined ? {} : { gate: details.gate }),
    };
    this.errorCode = 'AUTHORITY_ACTION_REFUSED_ERROR';
  }
}
