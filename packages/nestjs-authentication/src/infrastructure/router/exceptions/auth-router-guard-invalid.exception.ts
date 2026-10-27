import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthRouterException } from './auth-router.exception.js';

export class AuthRouterGuardInvalidException extends AuthRouterException {
  constructor(provider: string, options?: RuntimeExceptionOptions) {
    super({
      safeMessage: `Invalid guard configuration for Auth Router provider '${provider}'.`,
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'AUTH_ROUTER_GUARD_INVALID_ERROR';
  }
}
