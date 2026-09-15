import { HttpStatus } from '@nestjs/common';

import { UserException } from './user.exception.js';

export class UserPasswordCurrentInvalidException extends UserException {
  constructor(options?: { message?: string; originalError?: unknown }) {
    super({
      message: options?.message ?? 'Current password is not valid',
      httpStatus: HttpStatus.BAD_REQUEST,
      originalError: options?.originalError,
      fault: 'client',
    });
    this.errorCode = 'USER_PASSWORD_CURRENT_INVALID';
  }
}
