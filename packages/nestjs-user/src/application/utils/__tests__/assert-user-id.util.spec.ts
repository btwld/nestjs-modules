import { HttpStatus } from '@nestjs/common';

import { UserException } from '../../../domain/exceptions/user.exception.js';
import { assertUserId } from '../assert-user-id.util.js';

describe('assertUserId', () => {
  it('should not throw for a valid string id', () => {
    expect(() => assertUserId('abc-123')).not.toThrow();
  });

  it('should throw UserException for an empty string', () => {
    expect(() => assertUserId('')).toThrow(UserException);
  });

  it('should throw UserException for a whitespace-only string', () => {
    expect(() => assertUserId('   ')).toThrow(UserException);
  });

  it('should throw UserException for undefined', () => {
    expect(() => assertUserId(undefined)).toThrow(UserException);
  });

  it('should throw UserException for null', () => {
    expect(() => assertUserId(null)).toThrow(UserException);
  });

  it('should throw UserException for a number', () => {
    expect(() => assertUserId(42)).toThrow(UserException);
  });

  it('should throw with httpStatus BAD_REQUEST and a safe message', () => {
    try {
      assertUserId(42);
      throw new Error('Expected UserException');
    } catch (e) {
      expect(e).toBeInstanceOf(UserException);
      expect((e as UserException).httpStatus).toBe(HttpStatus.BAD_REQUEST);
      expect((e as UserException).safeMessage).toBe('Invalid id');
    }
  });
});
