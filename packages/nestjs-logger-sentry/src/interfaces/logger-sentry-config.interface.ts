import { type NodeOptions as SentryNodeOptions } from '@sentry/node';

/**
 * Interface for Sentry configuration to define the log level
 * mapping to be used on Sentry transport.
 */
export interface LoggerSentryConfigInterface extends SentryNodeOptions {
  dsn: string;
}
