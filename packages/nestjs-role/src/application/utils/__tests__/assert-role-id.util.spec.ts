import { HttpStatus } from '@nestjs/common';

import { RoleException } from '../../exceptions/role.exception.js';
import { assertRoleId } from '../assert-role-id.util.js';

describe('assertRoleId', () => {
  it('should not throw for a valid string id', () => {
    expect(() => assertRoleId('abc-123')).not.toThrow();
  });

  it('should throw RoleException for an empty string', () => {
    expect(() => assertRoleId('')).toThrow(RoleException);
  });

  it('should throw RoleException for a whitespace-only string', () => {
    expect(() => assertRoleId('   ')).toThrow(RoleException);
  });

  it('should throw RoleException for undefined', () => {
    expect(() => assertRoleId(undefined)).toThrow(RoleException);
  });

  it('should throw RoleException for null', () => {
    expect(() => assertRoleId(null)).toThrow(RoleException);
  });

  it('should throw RoleException for a number', () => {
    expect(() => assertRoleId(42)).toThrow(RoleException);
  });

  it('should throw with httpStatus BAD_REQUEST and a safe message', () => {
    try {
      assertRoleId(42);
      throw new Error('Expected RoleException');
    } catch (e) {
      expect(e).toBeInstanceOf(RoleException);
      expect((e as RoleException).httpStatus).toBe(HttpStatus.BAD_REQUEST);
      expect((e as RoleException).safeMessage).toBe('Invalid id');
    }
  });
});
