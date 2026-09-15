import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { LocalInvalidCredentialsException } from '../../infrastructure/strategies/local/exceptions/local-invalid-credentials.exception.js';

export class LocalUserInactiveException extends LocalInvalidCredentialsException {
  constructor(userName: string, options?: RuntimeExceptionOptions) {
    super({
      message: `User with username '%s' is inactive`,
      messageParams: [userName],
      ...options,
    });

    this.errorCode = 'AUTH_LOCAL_USER_INACTIVE_ERROR';
  }
}
