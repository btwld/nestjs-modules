import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthenticationException } from '../../domain/exceptions/authentication.exception.js';

/**
 * Exception thrown when requireUserValidation is enabled but no user port is configured.
 */
export class AuthenticationUserPortRequiredException extends AuthenticationException {
  constructor(options?: Omit<RuntimeExceptionOptions, 'httpStatus'>) {
    super({
      message:
        'User port is required when requireUserValidation is enabled, but no user port was configured.',
      fault: 'usage',
      ...options,
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    });
    this.errorCode = 'AUTHENTICATION_USER_PORT_REQUIRED_ERROR';
  }
}
