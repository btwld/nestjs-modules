import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthAppleException } from './auth-apple-exception';

export class AuthAppleInvalidIssuerException extends AuthAppleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Apple token issuer is not valid.',
      ...options,
    });

    this.errorCode = 'AUTH_APPLE_INVALID_ISSUER';
  }
}
