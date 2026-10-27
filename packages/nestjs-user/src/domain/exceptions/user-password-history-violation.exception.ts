import { HttpStatus } from '@nestjs/common';

import { UserException } from './user.exception.js';

export class UserPasswordHistoryViolationException extends UserException {
  constructor(options?: { message?: string; originalError?: unknown }) {
    super({
      message: options?.message ?? 'Password has been used too recently',
      httpStatus: HttpStatus.BAD_REQUEST,
      originalError: options?.originalError,
      fault: 'client',
    });
    this.errorCode = 'USER_PASSWORD_HISTORY_VIOLATION';
  }
}
