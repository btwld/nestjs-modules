import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { ReportException } from './report.exception';

export class ReportCreateException extends ReportException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to create a report',
      ...options,
    });

    this.errorCode = 'REPORT_CREATE_ERROR';
  }
}
