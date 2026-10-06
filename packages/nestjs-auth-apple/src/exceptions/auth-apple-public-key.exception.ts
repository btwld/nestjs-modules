import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthAppleException } from './auth-apple-exception';

export class AuthApplePublicKeyException extends AuthAppleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Apple public key was not able to be retrieved.',
      ...options,
    });

    this.errorCode = 'AUTH_APPLE_PUBLIC_KEY_ERROR';
  }
}
