import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthGoogleException } from './auth-google.exception';

export class AuthGoogleMissingIdException extends AuthGoogleException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Google did not return an id for the user.',
      ...options,
    });

    this.errorCode = 'AUTH_GOOGLE_MISSING_PROFILE_ID_ERROR';
  }
}
