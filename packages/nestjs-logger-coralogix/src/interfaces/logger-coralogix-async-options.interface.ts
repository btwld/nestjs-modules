import { type FactoryProvider, type ModuleMetadata } from '@nestjs/common';

import { type CoralogixOptionsInterface } from './logger-coralogix-options.interface';

/**
 * Coralogix async options.
 */
export interface CoralogixAsyncOptionsInterface
  extends
    Pick<ModuleMetadata, 'imports'>,
    Pick<
      FactoryProvider<
        CoralogixOptionsInterface | Promise<CoralogixOptionsInterface>
      >,
      'useFactory' | 'inject'
    > {}
