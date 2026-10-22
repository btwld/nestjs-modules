import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

export class AuthenticationEmailException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({ fault: 'internal', ...options });
    this.errorCode = 'AUTHENTICATION_EMAIL_ERROR';
  }
}
