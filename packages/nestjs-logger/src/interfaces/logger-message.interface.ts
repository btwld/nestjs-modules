import { type LogLevel } from '@nestjs/common';

export interface LoggerMessageInterface {
  message?: string;
  logLevel?: LogLevel;
  error?: Error | string;
}
