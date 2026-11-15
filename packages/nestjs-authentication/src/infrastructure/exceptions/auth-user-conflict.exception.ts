import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthenticationException } from '../../domain/exceptions/authentication.exception.js';

/**
 * Thrown when a second guard on one call authenticates a different user
 * than the first: one call acts for one user, so the call is refused
 * rather than left acting for either.
 */
export class AuthUserConflictException extends AuthenticationException {
  constructor(options?: Omit<RuntimeExceptionOptions, 'httpStatus'>) {
    super({
      safeMessage: 'The credentials on this request name more than one user.',
      fault: 'client',
      ...options,
      httpStatus: HttpStatus.UNAUTHORIZED,
    });

    this.errorCode = 'AUTH_USER_CONFLICT_ERROR';
  }
}
