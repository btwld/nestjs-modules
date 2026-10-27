import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { AuthGithubException } from './auth-github.exception';

export class AuthGithubMissingIdException extends AuthGithubException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'GitHub did not return an id for the user.',
      ...options,
    });

    this.errorCode = 'AUTH_GITHUB_MISSING_PROFILE_ID_ERROR';
  }
}
