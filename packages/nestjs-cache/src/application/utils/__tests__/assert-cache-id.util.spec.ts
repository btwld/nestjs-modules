import { HttpStatus } from '@nestjs/common';

import { CacheException } from '../../../domain/exceptions/cache.exception.js';
import { assertCacheId } from '../assert-cache-id.util.js';

describe('assertCacheId', () => {
  it('should not throw for a valid string', () => {
    expect(() => assertCacheId('abc-123')).not.toThrow();
  });

  it('should throw CacheException for an empty string', () => {
    expect(() => assertCacheId('')).toThrow(CacheException);
  });

  it('should throw CacheException for number', () => {
    expect(() => assertCacheId(123)).toThrow(CacheException);
  });

  it('should throw CacheException for undefined', () => {
    expect(() => assertCacheId(undefined)).toThrow(CacheException);
  });

  it('should throw CacheException for null', () => {
    expect(() => assertCacheId(null)).toThrow(CacheException);
  });

  it('should throw CacheException for object', () => {
    expect(() => assertCacheId({})).toThrow(CacheException);
  });

  it('should include typeof in error message', () => {
    try {
      assertCacheId(42);
      throw new Error('Expected CacheException');
    } catch (e) {
      expect(e).toBeInstanceOf(CacheException);
      expect((e as CacheException).message).toContain('number');
    }
  });

  it('should throw with httpStatus BAD_REQUEST and a safe message', () => {
    try {
      assertCacheId(42);
      throw new Error('Expected CacheException');
    } catch (e) {
      expect(e).toBeInstanceOf(CacheException);
      expect((e as CacheException).httpStatus).toBe(HttpStatus.BAD_REQUEST);
      expect((e as CacheException).safeMessage).toBe('Invalid id');
    }
  });
});
