import {
  type ConfigFactory,
  type ConfigFactoryKeyHost,
  registerAs,
} from '@nestjs/config';

import { splitLogLevel } from '@concepta/nestjs-logger';

import { type LoggerCoralogixSettingsInterface } from '../interfaces/logger-coralogix-settings.interface';
import { formatMessage, logLevelMap } from '../utils';

/**
 * The token to which all coralogix module settings are set.
 */
export const LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN =
  'LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN';

/**
 * Coralogix config factory type.
 */
export type CoralogixConfigFactory =
  ConfigFactory<LoggerCoralogixSettingsInterface> & ConfigFactoryKeyHost;

/**
 * Configuration for Coralogix.
 */
export const coralogixConfig: (() => LoggerCoralogixSettingsInterface) &
  ConfigFactoryKeyHost<ReturnType<() => LoggerCoralogixSettingsInterface>> =
  registerAs(
    'LOGGER_CORALOGIX_MODULE_DEFAULT_CONFIG',
    (): LoggerCoralogixSettingsInterface => ({
      /**
       * Get log levels from environment variables
       */
      logLevel:
        'CORALOGIX_LOG_LEVEL' in process.env && process.env.CORALOGIX_LOG_LEVEL
          ? splitLogLevel(process.env.CORALOGIX_LOG_LEVEL)
          : ['error'],

      /**
       * Mapping from log level to coralogix severity
       *
       * @param logLevel - The log level
       * @returns CoralogixLogSeverity
       */
      logLevelMap: logLevelMap,
      formatMessage,
      transportConfig: {
        category:
          'CORALOGIX_CATEGORY' in process.env && process.env.CORALOGIX_CATEGORY
            ? process.env.CORALOGIX_CATEGORY
            : '',
        applicationName:
          'CORALOGIX_APPLICATION_NAME' in process.env &&
          process.env.CORALOGIX_APPLICATION_NAME
            ? process.env.CORALOGIX_APPLICATION_NAME
            : '',
        privateKey:
          'CORALOGIX_PRIVATE_KEY' in process.env &&
          process.env.CORALOGIX_PRIVATE_KEY
            ? process.env.CORALOGIX_PRIVATE_KEY
            : '',
        subsystemName:
          'CORALOGIX_SUBSYSTEM_NAME' in process.env &&
          process.env.CORALOGIX_SUBSYSTEM_NAME
            ? process.env.CORALOGIX_SUBSYSTEM_NAME
            : '',
      },
    }),
  );
