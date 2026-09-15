import { type LogLevel } from '@nestjs/common';

/**
 * Interface for 3dr party transport.
 *
 * To create a custom transport service, implements the
 * {@link LoggerTransportInterface} Interface.
 *
 * You can create a custom log method to submit the information to any
 * 3rd party transport you want to implement
 *
 * @example
 * ```ts
 * @Injectable()
 * export class LoggerSentryTransport implements LoggerTransportInterface {
 *   constructor() {}
 *
 *   log(message: string, logLevel: LogLevel, error?: Error | string): void {
 *     // forward message to custom transport
 *   }
 * }
 *```
 */
export interface LoggerTransportInterface {
  logLevel?: LogLevel[] | null;

  /**
   * Transport log method
   *
   * @param message - Message to be logged
   * @param logLevel - The log level that logger should consider
   * @param error - an optional error that can be sent
   */
  log(message: string, logLevel: LogLevel, error?: Error): void;
}
