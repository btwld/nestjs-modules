import { type NestInterceptor } from '@nestjs/common';
import { type BaseExceptionFilter } from '@nestjs/core';

import { type LoggerSettingsInterface } from './logger-settings.interface';
import { type LoggerTransportInterface } from './logger-transport.interface';

/**
 * Logger options interface.
 */
export interface LoggerOptionsInterface {
  transports?: LoggerTransportInterface[];

  exceptionFilter?: BaseExceptionFilter;

  requestInterceptor?: NestInterceptor<Response>;

  settings?: LoggerSettingsInterface;
}
