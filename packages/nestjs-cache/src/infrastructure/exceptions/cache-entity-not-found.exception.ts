import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { CacheException } from '../../domain/exceptions/cache.exception.js';

export class CacheEntityNotFoundException extends CacheException {
  declare context: RuntimeException['context'] & {
    entityName: string;
  };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Entity %s was not registered to be used.',
      messageParams: [entityName],
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'CACHE_ENTITY_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      entityName,
    };
  }
}
