import { HttpStatus } from '@nestjs/common';

import { OtpException } from './otp.exception.js';

export class OtpInvalidExpirationDateException extends OtpException {
  constructor() {
    super({
      message: 'Invalid expiresIn',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });
    this.errorCode = 'OTP_INVALID_EXPIRES_IN';
  }
}
