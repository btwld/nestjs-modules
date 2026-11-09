import { type FactoryProvider, type ModuleMetadata } from '@nestjs/common';

import { type LoggerSentryOptionsInterface } from './logger-sentry-options.interface';

/**
 * LoggerSentry async options.
 */
export interface LoggerSentryAsyncOptionsInterface
  extends
    Pick<ModuleMetadata, 'imports'>,
    Pick<
      FactoryProvider<
        LoggerSentryOptionsInterface | Promise<LoggerSentryOptionsInterface>
      >,
      'useFactory' | 'inject'
    > {}
