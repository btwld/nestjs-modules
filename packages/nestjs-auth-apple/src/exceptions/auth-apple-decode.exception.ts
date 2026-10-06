import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthAppleException } from './auth-apple-exception';

export class AuthAppleDecodeException extends AuthAppleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Apple token was not able to be decoded.',
      ...options,
    });

    this.errorCode = 'AUTH_APPLE_DECODE_ERROR';
  }
}
