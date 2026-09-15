import { HttpStatus } from '@nestjs/common';

import { InvitationException } from './invitation.exception.js';

export class InvitationAlreadyAcceptedException extends InvitationException {
  constructor() {
    super({
      message: 'Invitation has already been accepted',
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
    });

    this.errorCode = 'INVITATION_ALREADY_ACCEPTED_ERROR';
  }
}
