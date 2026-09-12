import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { JwtAuthenticationException } from './jwt-authentication.exception.js';

export class JwtUnauthorizedException extends JwtAuthenticationException {
  constructor(options?: Omit<RuntimeExceptionOptions, 'httpStatus'>) {
    super({
      safeMessage: 'Unable to authenticate user with provided JWT token.',
      fault: 'client',
      ...options,
      httpStatus: HttpStatus.UNAUTHORIZED,
    });

    this.errorCode = 'AUTH_JWT_UNAUTHORIZED_ERROR';
  }
}
