import { type LogLevel } from '@nestjs/common';
import {
  type ConfigFactory,
  type ConfigFactoryKeyHost,
  registerAs,
} from '@nestjs/config';

import { type LoggerSettingsInterface } from '../interfaces/logger-settings.interface';
import { splitLogLevel } from '../utils/config-parser.util';

/**
 * The token to which all logger module settings are set.
 */
export const LOGGER_MODULE_SETTINGS_TOKEN = 'LOGGER_MODULE_SETTINGS_TOKEN';

/**
 * Valid log levels.
 */
export const LOGGER_VALID_LOG_LEVELS: LogLevel[] = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
];

/**
 * Logger config factory type.
 */
export type LoggerConfigFactory = ConfigFactory<LoggerSettingsInterface> &
  ConfigFactoryKeyHost;

/**
 * Configuration for Logger.
 */
export const loggerConfig: (() => LoggerSettingsInterface) &
  ConfigFactoryKeyHost<ReturnType<() => LoggerSettingsInterface>> = registerAs(
  'LOGGER_MODULE_DEFAULT_CONFIG',
  (): LoggerSettingsInterface => ({
    /**
     * Get log levels from environment variables
     */
    logLevel:
      'LOG_LEVEL' in process.env && process.env.LOG_LEVEL
        ? splitLogLevel(process.env.LOG_LEVEL)
        : ['error'],
  }),
);
