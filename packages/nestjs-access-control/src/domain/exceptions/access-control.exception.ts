import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

export class AccessControlException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'ACCESS_CONTROL_ERROR';
  }
}
