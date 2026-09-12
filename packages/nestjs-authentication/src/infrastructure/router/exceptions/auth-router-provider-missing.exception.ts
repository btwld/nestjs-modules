import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { AuthRouterException } from './auth-router.exception.js';

export class AuthRouterProviderMissingException extends AuthRouterException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage:
        'Auth Router provider is required in the request query parameters.',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'AUTH_ROUTER_PROVIDER_MISSING_ERROR';
  }
}
