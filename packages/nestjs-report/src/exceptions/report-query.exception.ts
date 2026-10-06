import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { ReportException } from './report.exception';

export class ReportQueryException extends ReportException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to do a query to report',
      ...options,
    });

    this.errorCode = 'REPORT_QUERY_ERROR';
  }
}
