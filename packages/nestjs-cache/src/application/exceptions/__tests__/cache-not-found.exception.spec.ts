import { HttpStatus } from '@nestjs/common';

import { CacheException } from '../../../domain/exceptions/cache.exception.js';
import { CacheNotFoundException } from '../cache-not-found.exception.js';

describe(CacheNotFoundException.name, () => {
  it('should be an instance of CacheException', () => {
    const exception = new CacheNotFoundException('abc');
    expect(exception).toBeInstanceOf(CacheException);
  });

  it('should interpolate id into message', () => {
    const exception = new CacheNotFoundException('abc');
    expect(exception.message).toBe('Cache not found for id=abc');
  });

  it('should have httpStatus NOT_FOUND', () => {
    const exception = new CacheNotFoundException('abc');
    expect(exception.httpStatus).toBe(HttpStatus.NOT_FOUND);
  });

  it('should have errorCode CACHE_NOT_FOUND_ERROR', () => {
    const exception = new CacheNotFoundException('abc');
    expect(exception.errorCode).toBe('CACHE_NOT_FOUND_ERROR');
  });

  it('should include id in context', () => {
    const exception = new CacheNotFoundException('abc');
    expect(exception.context).toEqual(expect.objectContaining({ id: 'abc' }));
  });

  it('should accept a custom message', () => {
    const exception = new CacheNotFoundException('abc', 'Custom %s');
    expect(exception.message).toBe('Custom abc');
  });
});
