import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

export class LoggerCoralogixException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'LOGGER_CORALOGIX_EXCEPTION';
  }
}
