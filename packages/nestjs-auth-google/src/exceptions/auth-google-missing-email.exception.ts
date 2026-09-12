import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthGoogleException } from './auth-google.exception';

export class AuthGoogleMissingEmailException extends AuthGoogleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Google did not return an email address for the user.',
      ...options,
    });

    this.errorCode = 'AUTH_GOOGLE_MISSING_PROFILE_EMAIL_ERROR';
  }
}
