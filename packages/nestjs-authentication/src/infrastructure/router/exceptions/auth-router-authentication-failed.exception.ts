import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthRouterException } from './auth-router.exception.js';

export class AuthRouterAuthenticationFailedException extends AuthRouterException {
  constructor(
    provider: string,
    errorMessage: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      safeMessage: `Auth Router authentication failed for provider '${provider}': ${errorMessage}`,
      httpStatus: HttpStatus.UNAUTHORIZED,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'AUTH_ROUTER_AUTHENTICATION_FAILED_ERROR';
  }
}
