import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

export class ReportException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'REPORT_ERROR';
  }
}
