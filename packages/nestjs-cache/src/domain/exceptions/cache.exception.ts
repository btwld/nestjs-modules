import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';
/**
 * Generic cache exception.
 */
export class CacheException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'CACHE_ERROR';
  }
}
