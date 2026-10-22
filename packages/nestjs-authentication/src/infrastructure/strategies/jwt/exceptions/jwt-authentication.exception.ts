import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthenticationException } from '../../../../domain/exceptions/authentication.exception.js';

export class JwtAuthenticationException extends AuthenticationException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'AUTH_JWT_ERROR';
  }
}
