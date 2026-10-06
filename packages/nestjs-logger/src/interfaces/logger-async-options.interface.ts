import { type FactoryProvider, type ModuleMetadata } from '@nestjs/common';

import { type LoggerOptionsInterface } from './logger-options.interface';

/**
 * Logger async options.
 */
export interface LoggerAsyncOptionsInterface
  extends
    Pick<ModuleMetadata, 'imports'>,
    Pick<
      FactoryProvider<LoggerOptionsInterface | Promise<LoggerOptionsInterface>>,
      'useFactory' | 'inject'
    > {}
