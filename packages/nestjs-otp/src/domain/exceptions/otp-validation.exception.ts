import { type StandardSchemaV1 } from '@standard-schema/spec';

import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { OtpException } from './otp.exception.js';

export class OtpValidationException extends OtpException {
  declare context: OtpException['context'] & {
    schemaName: string;
    validationErrors: readonly StandardSchemaV1.Issue[];
  };

  constructor(
    schemaName: string,
    validationErrors: readonly StandardSchemaV1.Issue[],
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Data for the %s schema is not valid',
      messageParams: [schemaName],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, schemaName, validationErrors };
    this.errorCode = 'OTP_VALIDATION_ERROR';
  }
}
