import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { PasswordException } from './password.exception.js';

export class PasswordRequiredException extends PasswordException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Password is required for hashing, but none was provided.',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'PASSWORD_REQUIRED_ERROR';
  }
}
