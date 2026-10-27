import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { LocalInvalidCredentialsException } from '../../infrastructure/strategies/local/exceptions/local-invalid-credentials.exception.js';

export class LocalUsernameNotFoundException extends LocalInvalidCredentialsException {
  constructor(userName: string, options?: RuntimeExceptionOptions) {
    super({
      message: `No user found for username: %s`,
      messageParams: [userName],
      ...options,
    });

    this.errorCode = 'AUTH_LOCAL_USERNAME_NOT_FOUND_ERROR';
  }
}
