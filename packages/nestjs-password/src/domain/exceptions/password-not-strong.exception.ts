import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { PasswordException } from './password.exception.js';

export class PasswordNotStrongException extends PasswordException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Password is not strong enough',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'PASSWORD_NOT_STRONG_ERROR';
  }
}
