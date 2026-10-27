import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { LoggerException } from './logger.exceptions';

/**
 * Generic exception.
 */
export class LoggerInvalidLogLevelException extends LoggerException {
  constructor(levelTrimmed: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'The string "%s" is not a valid log level.',
      messageParams: [levelTrimmed],
      ...options,
    });
    this.errorCode = 'LOGGER_INVALID_LOG_LEVEL_ERROR';
  }
}
