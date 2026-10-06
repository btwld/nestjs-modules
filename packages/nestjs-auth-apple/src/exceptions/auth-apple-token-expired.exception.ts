import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthAppleException } from './auth-apple-exception';

export class AuthAppleTokenExpiredException extends AuthAppleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Apple oauth token has expired.',
      ...options,
    });

    this.errorCode = 'AUTH_APPLE_OAUTH_TOKEN_EXPIRED';
  }
}
