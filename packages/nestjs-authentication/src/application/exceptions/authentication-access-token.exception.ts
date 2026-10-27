import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthenticationException } from '../../domain/exceptions/authentication.exception.js';

/**
 * Exception for authentication
 */
export class AuthenticationAccessTokenException extends AuthenticationException {
  constructor(options?: Omit<RuntimeExceptionOptions, 'httpStatus'>) {
    super({
      message: 'Access token was verified, but failed further validation.',
      fault: 'client',
      ...options,
      httpStatus: HttpStatus.UNAUTHORIZED,
    });
    this.errorCode = 'AUTHENTICATION_ACCESS_TOKEN_ERROR';
  }
}
