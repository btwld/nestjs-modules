import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * The base of every access control exception: catch it to handle any of
 * them.
 */
export class AccessControlException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'ACCESS_CONTROL_ERROR';
  }
}
