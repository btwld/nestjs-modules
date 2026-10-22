import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthGithubException } from './auth-github.exception';

export class AuthGithubMissingEmailException extends AuthGithubException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'GitHub did not return an email address for the user.',
      ...options,
    });

    this.errorCode = 'AUTH_GITHUB_MISSING_PROFILE_EMAIL_ERROR';
  }
}
