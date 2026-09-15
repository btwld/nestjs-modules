import { HttpStatus } from '@nestjs/common';

import { InvitationAlreadyAcceptedException } from '../invitation-already-accepted.exception.js';
import { InvitationException } from '../invitation.exception.js';

describe(InvitationAlreadyAcceptedException.name, () => {
  it('should be an instance of InvitationException', () => {
    const exception = new InvitationAlreadyAcceptedException();
    expect(exception).toBeInstanceOf(InvitationException);
  });

  it('should have httpStatus CONFLICT', () => {
    const exception = new InvitationAlreadyAcceptedException();
    expect(exception.httpStatus).toBe(HttpStatus.CONFLICT);
  });

  it('should have fault client', () => {
    const exception = new InvitationAlreadyAcceptedException();
    expect(exception.fault).toBe('client');
  });

  it('should have errorCode INVITATION_ALREADY_ACCEPTED_ERROR', () => {
    const exception = new InvitationAlreadyAcceptedException();
    expect(exception.errorCode).toBe('INVITATION_ALREADY_ACCEPTED_ERROR');
  });
});
