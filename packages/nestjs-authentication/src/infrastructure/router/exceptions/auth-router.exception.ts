import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';
/**
 * Generic auth router exception.
 */
export class AuthRouterException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'AUTH_ROUTER_ERROR';
  }
}
