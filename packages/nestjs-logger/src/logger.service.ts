import { ConsoleLogger, HttpException, Injectable } from '@nestjs/common';
import { LogLevel } from '@nestjs/common/services/logger.service';

import { LoggerException } from './exceptions/logger.exceptions';
import { LoggerServiceInterface } from './interfaces/logger-service.interface';
import { LoggerTransportInterface } from './interfaces/logger-transport.interface';
import { LoggerTransportService } from './logger-transport.service';

/**
 * A service that extends the Logger class and implements {@link LoggerServiceInterface}.
 *
 * The LoggerService class contains the implementation of a custom Logger
 * where it will call System logger and any third party transport log that was added.
 *
 * You will need to create a custom logger and we must ensure that at least one application module imports the LoggerService
 * to trigger Nest to instantiate a singleton instance of our LoggerService class.
 *
 * @example
 * ```ts
 * // Initialize a module that have the LoggerService imported
 * const app = await NestFactory.create(AppModule);
 *
 * // Get the singleton instance of LoggerService
 * const customLogger = app.get(LoggerService);
 *
 * // Get the transport instance
 * const sentry = app.get(LoggerSentryTransport);
 *
 * // Add the transports you want to use
 * customLogger.addTransport(sentry);
 *
 * // Overwrite the the default Logger for a custom logger
 * // This is to inform that this logger will new used internally
 * // Or it will be used once yuo do a new Logger()
 * app.useLogger(customLogger);
 *
 * await app.listen(3000);
 * ```
 */
@Injectable()
export class LoggerService
  extends ConsoleLogger
  implements LoggerServiceInterface
{
  /**
   * Constructor
   *
   * @param transportService - transport service
   */
  constructor(protected readonly transportService: LoggerTransportService) {
    super();
  }

  /**
   * Add a transport to be used for every log, it can be multiples
   *
   * @param transport - The transport that will be used beside the system logger
   */
  addTransport(transport: LoggerTransportInterface): void {
    this.transportService.addTransport(transport);
  }

  /**
   * Method to log an exception
   *
   * If the exception is between 400 and 500 status code
   * it will be logged as a debug log level, otherwise it will be logged as an error.
   *
   * @param error - Error to be registered
   * @param message - Error Message
   * @param context - Context of current error
   */
  exception(error: Error, message?: string, context?: string): void {
    // message is missing?
    if (!message) {
      // yes, set it
      message = error.message;
    }

    // is this a low severity http exception?
    if (
      error instanceof HttpException &&
      error.getStatus() >= 400 &&
      error.getStatus() < 500
    ) {
      // not severe, log it as debug
      super.debug(message, this.getContext(context));
      // pass full exception to transport service
      this.transportService.log(message, 'debug' as LogLevel, error);
    } else {
      // log as error
      super.error(message, error.stack, this.getContext(context));
      // pass full exception to transport service
      this.transportService.log(message, 'error' as LogLevel, error);
    }
  }

  /**
   * Method to be called when an error should be logged.
   *
   * @param message - Error Message
   * @param trace - Stack trace error
   * @param context - Context of current Message
   */
  error(message: string, trace?: string, context?: string): void {
    super.error(message, trace, this.getContext(context));
    // get a trace?
    if (trace) {
      // yes, build up real error
      const error = new LoggerException({ message });
      error.stack = trace;
      // call transport with error
      this.transportService.log(message, 'error' as LogLevel, error);
    } else {
      // call transport with no error
      this.transportService.log(message, 'error' as LogLevel);
    }
  }

  /**
   * Method to be used when a warn message should be logged.
   *
   * @param message - Warn Message
   * @param context - Context of Message
   */
  warn(message: string, context?: string) {
    super.warn(message, this.getContext(context));
    this.transportService.log(message, 'warn' as LogLevel);
  }

  /**
   * Method to be used when a debug message should be logged.
   *
   * @param message - Debug Message
   * @param context - Context of Message
   */
  debug(message: string, context?: string) {
    super.debug(message, this.getContext(context));
    this.transportService.log(message, 'debug' as LogLevel);
  }

  /**
   * Method to be used when a simple log message should be logged.
   *
   * @param message - Log message
   * @param context - Context of Message
   */
  log(message: string, context?: string) {
    super.log(message, this.getContext(context));
    this.transportService.log(message, 'log' as LogLevel);
  }

  /**
   * Method to be used when a verbose message should be logged.
   *
   * @param message - Verbose Message
   * @param context - Context Message
   */
  verbose(message: string, context?: string) {
    super.verbose(message, this.getContext(context));
    this.transportService.log(message, 'verbose' as LogLevel);
  }

  private getContext(context?: string) {
    return context ? context : (this.context ?? '');
  }
}
