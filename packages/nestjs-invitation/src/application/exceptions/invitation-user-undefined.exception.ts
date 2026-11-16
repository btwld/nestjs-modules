import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { InvitationException } from '../../domain/exceptions/invitation.exception.js';

/**
 * Thrown when a user cannot be resolved from the user port.
 */
export class InvitationUserUndefinedException extends InvitationException {
  static errorMessage =
    "Can't resolve a valid user from the user port. Check invitation module port configuration.";

  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: InvitationUserUndefinedException.errorMessage,
      fault: 'usage',
      ...options,
    });
    this.errorCode = 'INVITATION_USER_UNDEFINED_ERROR';
  }
}
