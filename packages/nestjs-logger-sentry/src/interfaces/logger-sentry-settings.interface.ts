import { type SeverityLevel } from '@sentry/types';

import {
  type LoggerSettingsInterface,
  type LoggerTransportSettingsInterface,
} from '@concepta/nestjs-logger';

import { type LoggerSentryConfigInterface } from './logger-sentry-config.interface';

/**
 * LoggerSentry options interface.
 */
export interface LoggerSentrySettingsInterface
  extends
    Partial<Pick<LoggerSettingsInterface, 'logLevel'>>,
    LoggerTransportSettingsInterface<SeverityLevel> {
  /**
   *
   * @param transportConfig - The Sentry configuration
   */
  transportConfig: LoggerSentryConfigInterface;
}
