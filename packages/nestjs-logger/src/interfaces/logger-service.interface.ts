import { LoggerTransportInterface } from './logger-transport.interface';

/**
 * Logger Service Interface
 *
 * The interface with methods to be implemented to log information
 * as the Logger system or to a third party transport.
 */
export interface LoggerServiceInterface {
  /**
   * Add the transport that will be used.
   *
   * @param transport - Transport
   */
  addTransport(transport: LoggerTransportInterface): void;

  /**
   * Method to log an exception.
   *
   * @param error - The error to be logged
   * @param message - The Error Message to be logged
   * @param context - The Context of the message
   */
  exception(error: Error, message?: string, context?: string): void;

  /**
   * Method to log message as a error log level.
   *
   * @param message - Method to log message as an error
   * @param trace - Stack trace
   * @param context - The Context of the message
   */
  error(message: string, trace?: string, context?: string): void;

  /**
   * Method to log message as a warn log level.
   *
   * @param message - Method to log message as a warning
   * @param context - The Context of the message
   */
  warn(message: string, context?: string): void;

  /**
   * Debug method.
   *
   * @param message - Method to log message as a debug
   * @param context - The Context of the message
   */
  debug(message: string, context?: string): void;

  /**
   * Log method.
   *
   * @param message - Method to log message as a Log
   * @param context - The Context of the message
   */
  log(message: string, context?: string): void;

  /**
   * Verbose method.
   *
   * @param message - Method to log message as a Verbose
   * @param context - The Context of the message
   */
  verbose(message: string, context?: string): void;
}
