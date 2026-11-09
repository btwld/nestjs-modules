import { HttpStatus } from '@nestjs/common';

import { InvitationRevokedException } from '../invitation-revoked.exception.js';
import { InvitationException } from '../invitation.exception.js';

describe(InvitationRevokedException.name, () => {
  it('should be an instance of InvitationException', () => {
    const exception = new InvitationRevokedException();
    expect(exception).toBeInstanceOf(InvitationException);
  });

  it('should have httpStatus CONFLICT', () => {
    const exception = new InvitationRevokedException();
    expect(exception.httpStatus).toBe(HttpStatus.CONFLICT);
  });

  it('should have fault client', () => {
    const exception = new InvitationRevokedException();
    expect(exception.fault).toBe('client');
  });

  it('should have errorCode INVITATION_REVOKED_ERROR', () => {
    const exception = new InvitationRevokedException();
    expect(exception.errorCode).toBe('INVITATION_REVOKED_ERROR');
  });
});
