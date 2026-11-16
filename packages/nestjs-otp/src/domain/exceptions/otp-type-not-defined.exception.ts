import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { OtpException } from './otp.exception.js';

export class OtpTypeNotDefinedException extends OtpException {
  declare context: RuntimeException['context'] & {
    type: string;
  };

  constructor(type: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Type %s was not defined to be used. please check config.',
      messageParams: [type],
      fault: 'usage',
      ...options,
    });

    this.context = {
      ...this.context,
      type,
    };

    this.errorCode = 'OTP_TYPE_NOT_DEFINED_ERROR';
  }
}
