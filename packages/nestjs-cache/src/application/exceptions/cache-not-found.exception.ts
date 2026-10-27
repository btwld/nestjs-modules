import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { CacheException } from '../../domain/exceptions/cache.exception.js';

export class CacheNotFoundException extends CacheException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(id: string, message = 'Cache not found for id=%s') {
    super({
      httpStatus: HttpStatus.NOT_FOUND,
      message,
      messageParams: [id],
      fault: 'client',
    });

    this.errorCode = 'CACHE_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}
