import { type LoggerConfig } from 'coralogix-logger';
/**
 * Interface for Coralogix configuration to define the log level
 * mapping to be used on Coralogix transport.
 */
export interface LoggerCoralogixConfigInterface
  extends
    Pick<LoggerConfig, 'privateKey'>,
    Partial<Omit<LoggerConfig, 'privateKey'>> {
  category: string;
}
