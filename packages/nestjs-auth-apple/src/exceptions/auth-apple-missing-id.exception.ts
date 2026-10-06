import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthAppleException } from './auth-apple-exception';

export class AuthAppleMissingIdException extends AuthAppleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Apple did not return an id for the user.',
      ...options,
    });

    this.errorCode = 'AUTH_APPLE_MISSING_PROFILE_ID_ERROR';
  }
}
