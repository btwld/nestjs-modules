import { type Severity } from 'coralogix-logger';

import {
  type LoggerSettingsInterface,
  type LoggerTransportSettingsInterface,
} from '@concepta/nestjs-logger';

import { type LoggerCoralogixConfigInterface } from './logger-coralogix-config.interface';
/**
 * Coralogix options interface.
 */
export interface LoggerCoralogixSettingsInterface
  extends
    Partial<Pick<LoggerSettingsInterface, 'logLevel'>>,
    LoggerTransportSettingsInterface<Severity> {
  /**
   *
   * @param transportConfig - The coralogix configuration
   */
  transportConfig: LoggerCoralogixConfigInterface;
}
