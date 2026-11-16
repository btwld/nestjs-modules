import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { LocalUnauthorizedException } from './local-unauthorized.exception.js';

export class LocalInvalidCredentialsException extends LocalUnauthorizedException {
  constructor(options?: Omit<RuntimeExceptionOptions, 'httpStatus'>) {
    super({
      safeMessage:
        'The provided username or password is incorrect. Please try again.',
      fault: 'client',
      ...options,
    });

    this.errorCode = 'AUTH_LOCAL_INVALID_CREDENTIALS_ERROR';
  }
}
