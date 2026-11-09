import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { RecoveryException } from './recovery.exception.js';

export class RecoveryOtpInvalidException extends RecoveryException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: `Invalid recovery code provided`,
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'AUTH_RECOVERY_OTP_INVALID_ERROR';
  }
}
