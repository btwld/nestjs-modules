import { type LogLevel } from '@nestjs/common';

/**
 * Logger options interface.
 */
export interface LoggerSettingsInterface {
  /**
   * list of log levels allowed
   */
  logLevel: LogLevel[];
}
