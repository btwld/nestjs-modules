import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

export class AccessControllerException extends RuntimeException {
  constructor(message: string, options?: RuntimeExceptionOptions) {
    super({
      message,
      fault: 'usage',
      ...options,
    });
    this.errorCode = 'ACCESS_CONTROLLER_ERROR';
  }
}
