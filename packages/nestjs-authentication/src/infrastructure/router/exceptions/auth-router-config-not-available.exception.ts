import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthRouterException } from './auth-router.exception.js';

export class AuthRouterConfigNotAvailableException extends AuthRouterException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Auth Router configuration is not available or invalid.',
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'AUTH_ROUTER_CONFIG_NOT_AVAILABLE_ERROR';
  }
}
