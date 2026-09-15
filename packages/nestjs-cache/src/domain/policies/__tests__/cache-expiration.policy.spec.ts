import { type RuntimeException } from '@concepta/nestjs-core';

import { CacheExpirationPolicy } from '../cache-expiration.policy.js';

describe(CacheExpirationPolicy.name, () => {
  it('should return null when no expiresIn or default is configured', () => {
    const policy = new CacheExpirationPolicy();
    expect(policy.resolveExpirationDate()).toBeNull();
  });

  it('should resolve a client-supplied expiresIn', () => {
    const policy = new CacheExpirationPolicy();
    expect(policy.resolveExpirationDate('1h')).toBeInstanceOf(Date);
  });

  it('should classify a malformed client-supplied expiresIn as client fault', () => {
    const policy = new CacheExpirationPolicy();
    try {
      policy.resolveExpirationDate('not-a-duration');
      throw new Error('Expected a throw');
    } catch (e) {
      expect((e as RuntimeException).fault).toBe('client');
    }
  });

  it('should classify a malformed module-configured default as usage fault', () => {
    const policy = new CacheExpirationPolicy({ expiresIn: 'not-a-duration' });
    try {
      policy.resolveExpirationDate();
      throw new Error('Expected a throw');
    } catch (e) {
      expect((e as RuntimeException).fault).toBe('usage');
    }
  });
});
