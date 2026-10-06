import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthAppleException } from './auth-apple-exception';

export class AuthAppleMissingEmailException extends AuthAppleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Apple did not return an email address for the user.',
      ...options,
    });

    this.errorCode = 'AUTH_APPLE_MISSING_PROFILE_EMAIL_ERROR';
  }
}
