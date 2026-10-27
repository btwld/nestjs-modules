import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { InvitationException } from '../../domain/exceptions/invitation.exception.js';

export class InvitationNotFoundException extends InvitationException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(id: string, message = 'Invitation not found for id=%s') {
    super({
      httpStatus: HttpStatus.NOT_FOUND,
      message,
      messageParams: [id],
      fault: 'client',
    });

    this.errorCode = 'INVITATION_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}
