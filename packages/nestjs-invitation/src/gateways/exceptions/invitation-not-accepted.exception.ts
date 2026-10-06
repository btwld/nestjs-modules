import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { InvitationException } from '../../domain/exceptions/invitation.exception.js';

/**
 * Thrown when an invitation acceptance fails.
 *
 * Defaults to `internal`/500: the unqualified constructor is used to wrap an
 * unexpected error from the accept command. The caller-actionable case —
 * `otpPort.consume()` finding no match, i.e. a wrong or expired passcode —
 * is a distinct client mistake and overrides both fields at its throw site
 * in `AcceptInvitationRequestHandler`.
 */
export class InvitationNotAcceptedException extends InvitationException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      fault: 'internal',
      ...options,
    });
    this.errorCode = 'INVITATION_NOT_ACCEPTED_ERROR';
  }
}
