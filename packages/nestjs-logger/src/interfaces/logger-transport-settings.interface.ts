import { type LogLevel } from '@nestjs/common';

import { type LoggerMessageInterface } from './logger-message.interface';

/**
 * Logger options interface.
 */
export interface LoggerTransportSettingsInterface<T> {
  /**
   *
   * @param logLevel - level of severity
   * @returns The logLevel of the transport
   */
  logLevelMap: (logLevel: LogLevel) => T;

  /**
   * method to format a message based on properties of the logger
   *
   * @param loggerMessage - object with all properties to create a message
   * @returns
   */
  formatMessage: (loggerMessage: LoggerMessageInterface) => string;
}
