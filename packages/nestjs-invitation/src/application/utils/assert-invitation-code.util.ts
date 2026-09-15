import { HttpStatus } from '@nestjs/common';

import { InvitationException } from '../../domain/exceptions/invitation.exception.js';

/**
 * Asserts that `value` is a non-empty string invitation code.
 */
export function assertInvitationCode(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvitationException({
      message: 'Expected invitation code to be a non-empty string, got %s',
      messageParams: [typeof value],
      safeMessage: 'Invalid invitation code',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });
  }
}
