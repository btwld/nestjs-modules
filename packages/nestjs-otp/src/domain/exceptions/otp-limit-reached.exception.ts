import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { OtpException } from './otp.exception.js';

export class OtpLimitReachedException extends OtpException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'OTP creation limit reached for the time window.',
      httpStatus: HttpStatus.TOO_MANY_REQUESTS,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'OTP_LIMIT_REACHED_ERROR';
  }
}
