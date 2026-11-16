import { HttpStatus } from '@nestjs/common';

import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { ReportException } from './report.exception';

export class ReportDuplicateEntryException extends ReportException {
  context: RuntimeException['context'] & {
    serviceKey: string;
    reportName: string;
  };

  constructor(
    serviceKey: string,
    reportName: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Duplicate entry detected for service %s with report %s',
      httpStatus: HttpStatus.BAD_REQUEST,
      messageParams: [serviceKey, reportName],
      ...options,
    });

    this.errorCode = 'REPORT_DUPLICATE_ENTRY_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
      reportName,
    };
  }
}
