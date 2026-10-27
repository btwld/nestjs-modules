import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { VerifyException } from '../../infrastructure/mfa/verify/exceptions/verify.exception.js';

export class VerifyOtpInvalidException extends VerifyException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: `Invalid confirmation code provided`,
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'AUTH_VERIFY_OTP_INVALID_ERROR';
  }
}
