import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { OtpException } from '../../domain/exceptions/otp.exception.js';

export class OtpNotFoundException extends OtpException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(options: { id: string; message?: string }) {
    const { id, message = 'OTP not found for id=%s' } = options;

    super({
      httpStatus: HttpStatus.NOT_FOUND,
      message,
      messageParams: [id],
      fault: 'client',
    });

    this.errorCode = 'OTP_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}
