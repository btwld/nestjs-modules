import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';
/**
 * Generic auth github exception.
 */
export class AuthGithubException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'AUTH_GITHUB_ERROR';
  }
}
