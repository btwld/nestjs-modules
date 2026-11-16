import { HttpStatus } from '@nestjs/common';

import { UserException } from './user.exception.js';

export class UserCredentialsAlreadyExistException extends UserException {
  constructor(options?: { message?: string; originalError?: unknown }) {
    super({
      message: options?.message ?? 'User credentials already exist',
      httpStatus: HttpStatus.CONFLICT,
      originalError: options?.originalError,
      fault: 'client',
    });
    this.errorCode = 'USER_CREDENTIALS_ALREADY_EXIST';
  }
}
