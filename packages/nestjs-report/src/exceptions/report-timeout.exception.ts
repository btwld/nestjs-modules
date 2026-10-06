import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { ReportException } from './report.exception';

export class ReportTimeoutException extends ReportException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Report generation timed out.',
      ...options,
    });

    this.errorCode = 'REPORT_GENERATION_TIMEOUT';
  }
}
