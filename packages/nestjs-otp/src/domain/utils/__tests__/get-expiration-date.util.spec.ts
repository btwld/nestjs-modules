import { type RuntimeException } from '@concepta/nestjs-core';

import { getExpirationDate } from '../get-expiration-date.util.js';

describe('getExpirationDate', () => {
  it('should return a future Date for a valid duration string', () => {
    const now = new Date();
    const result = getExpirationDate('1h', now);

    expect(result.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
  });

  it('should classify an unparseable expiresIn as client fault', () => {
    try {
      getExpirationDate('not-a-duration');
      throw new Error('Expected a throw');
    } catch (e) {
      expect((e as RuntimeException).fault).toBe('client');
    }
  });
});
