import { HttpStatus } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { CacheException } from '../cache.exception.js';

describe(CacheException.name, () => {
  it('should be an instance of RuntimeException', () => {
    const exception = new CacheException();
    expect(exception).toBeInstanceOf(RuntimeException);
  });

  it('should have errorCode CACHE_ERROR', () => {
    const exception = new CacheException();
    expect(exception.errorCode).toBe('CACHE_ERROR');
  });

  it('should accept a custom message', () => {
    const exception = new CacheException({ message: 'custom error' });
    expect(exception.message).toBe('custom error');
  });

  it('should accept a custom httpStatus', () => {
    const exception = new CacheException({
      httpStatus: HttpStatus.CONFLICT,
    });
    expect(exception.httpStatus).toBe(HttpStatus.CONFLICT);
  });
});
