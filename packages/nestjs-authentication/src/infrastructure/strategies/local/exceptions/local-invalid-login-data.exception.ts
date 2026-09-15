import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { LocalException } from './local.exception.js';

export class LocalInvalidLoginDataException extends LocalException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Data validation error occurred before user validation.',
      safeMessage: 'The login data provided is invalid.',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'AUTH_LOCAL_INVALID_LOGIN_DATA_ERROR';
  }
}
