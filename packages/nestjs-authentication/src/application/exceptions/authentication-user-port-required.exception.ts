import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthenticationException } from '../../domain/exceptions/authentication.exception.js';

/**
 * Exception thrown when a token is validated against its user, but no user
 * port is configured. Configure `ports.user` to validate tokens, or use
 * `verifyAccessToken` / `verifyRefreshToken` for a signature-only check.
 */
export class AuthenticationUserPortRequiredException extends AuthenticationException {
  constructor(options?: Omit<RuntimeExceptionOptions, 'httpStatus'>) {
    super({
      message:
        'Token validation requires a user port, but none was configured. Configure ports.user, or use verifyAccessToken/verifyRefreshToken for a signature-only check.',
      fault: 'usage',
      ...options,
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    });
    this.errorCode = 'AUTHENTICATION_USER_PORT_REQUIRED_ERROR';
  }
}
