import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';
/**
 * Generic auth google exception.
 */
export class AuthGoogleException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'AUTH_GOOGLE_ERROR';
  }
}
