import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

export class LoggerException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'LOGGER_EXCEPTION';
  }
}
