import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { OtpException } from '../../domain/exceptions/otp.exception.js';

export class OtpEntityNotFoundException extends OtpException {
  declare context: RuntimeException['context'] & {
    entityName: string;
  };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Entity %s was not registered to be used.',
      messageParams: [entityName],
      fault: 'usage',
      ...options,
    });

    this.context = {
      ...this.context,
      entityName,
    };

    this.errorCode = 'OTP_ENTITY_NOT_FOUND_ERROR';
  }
}
