import { HttpStatus } from '@nestjs/common';

import { InvitationException } from '../../../domain/exceptions/invitation.exception.js';
import { assertInvitationCode } from '../assert-invitation-code.util.js';

describe('assertInvitationCode', () => {
  it('should not throw for a valid string code', () => {
    expect(() => assertInvitationCode('abc-123')).not.toThrow();
  });

  it('should throw InvitationException for an empty string', () => {
    expect(() => assertInvitationCode('')).toThrow(InvitationException);
  });

  it('should throw InvitationException for a whitespace-only string', () => {
    expect(() => assertInvitationCode('   ')).toThrow(InvitationException);
  });

  it('should throw InvitationException for undefined', () => {
    expect(() => assertInvitationCode(undefined)).toThrow(InvitationException);
  });

  it('should throw InvitationException for null', () => {
    expect(() => assertInvitationCode(null)).toThrow(InvitationException);
  });

  it('should throw InvitationException for a number', () => {
    expect(() => assertInvitationCode(42)).toThrow(InvitationException);
  });

  it('should throw with httpStatus BAD_REQUEST and a safe message', () => {
    try {
      assertInvitationCode(42);
      throw new Error('Expected InvitationException');
    } catch (e) {
      expect(e).toBeInstanceOf(InvitationException);
      expect((e as InvitationException).httpStatus).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect((e as InvitationException).safeMessage).toBe(
        'Invalid invitation code',
      );
    }
  });
});
