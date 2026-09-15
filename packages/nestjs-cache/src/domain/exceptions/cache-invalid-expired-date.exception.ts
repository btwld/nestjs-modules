import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { CacheException } from './cache.exception.js';

export class CacheInvalidExpiredDateException extends CacheException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Invalid expiresIn',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });
    this.errorCode = 'CACHE_INVALID_EXPIRES_IN';
  }
}
