import { HttpStatus } from '@nestjs/common';

import { InvitationException } from './invitation.exception.js';

export class InvitationRevokedException extends InvitationException {
  constructor() {
    super({
      message: 'Invitation has been revoked',
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
    });

    this.errorCode = 'INVITATION_REVOKED_ERROR';
  }
}
