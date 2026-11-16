import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { ReportException } from './report.exception';

export class ReportIdMissingException extends ReportException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Report id is missing.',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'REPORT_ID_MISSING_ERROR';
  }
}
