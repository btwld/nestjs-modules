import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { LocalException } from './local.exception.js';

export class LocalUnauthorizedException extends LocalException {
  constructor(options?: Omit<RuntimeExceptionOptions, 'httpStatus'>) {
    super({
      message: 'Unauthorized',
      safeMessage: 'Unauthorized',
      ...options,
      httpStatus: HttpStatus.UNAUTHORIZED,
    });

    this.errorCode = 'AUTH_LOCAL_UNAUTHORIZED_ERROR';
  }
}
