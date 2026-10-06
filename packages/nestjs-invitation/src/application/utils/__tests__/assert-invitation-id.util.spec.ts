import { HttpStatus } from '@nestjs/common';

import { InvitationException } from '../../../domain/exceptions/invitation.exception.js';
import { assertInvitationId } from '../assert-invitation-id.util.js';

describe('assertInvitationId', () => {
  it('should not throw for a valid string id', () => {
    expect(() => assertInvitationId('abc-123')).not.toThrow();
  });

  it('should throw InvitationException for an empty string', () => {
    expect(() => assertInvitationId('')).toThrow(InvitationException);
  });

  it('should throw InvitationException for a whitespace-only string', () => {
    expect(() => assertInvitationId('   ')).toThrow(InvitationException);
  });

  it('should throw InvitationException for undefined', () => {
    expect(() => assertInvitationId(undefined)).toThrow(InvitationException);
  });

  it('should throw InvitationException for null', () => {
    expect(() => assertInvitationId(null)).toThrow(InvitationException);
  });

  it('should throw InvitationException for a number', () => {
    expect(() => assertInvitationId(42)).toThrow(InvitationException);
  });

  it('should throw with httpStatus BAD_REQUEST and a safe message', () => {
    try {
      assertInvitationId(42);
      throw new Error('Expected InvitationException');
    } catch (e) {
      expect(e).toBeInstanceOf(InvitationException);
      expect((e as InvitationException).httpStatus).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect((e as InvitationException).safeMessage).toBe('Invalid id');
    }
  });
});
