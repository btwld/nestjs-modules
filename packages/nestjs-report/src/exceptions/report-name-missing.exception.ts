import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { ReportException } from './report.exception';

export class ReportNameMissingException extends ReportException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Reportname is missing.',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'REPORTNAME_MISSING_ERROR';
  }
}
