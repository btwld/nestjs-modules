import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthRouterException } from './auth-router.exception.js';

export class AuthRouterProviderNotSupportedException extends AuthRouterException {
  constructor(provider: string, options?: RuntimeExceptionOptions) {
    super({
      safeMessage: `Auth Router provider '${provider}' is not supported.`,
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'AUTH_ROUTER_PROVIDER_NOT_SUPPORTED_ERROR';
  }
}
