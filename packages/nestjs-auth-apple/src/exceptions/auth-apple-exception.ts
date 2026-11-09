import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';
/**
 * Generic auth local exception.
 */
export class AuthAppleException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'AUTH_APPLE_ERROR';
  }
}
