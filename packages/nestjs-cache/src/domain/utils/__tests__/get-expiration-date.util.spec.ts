import { type RuntimeException } from '@concepta/nestjs-core';

import { getExpirationDate } from '../get-expiration-date.util.js';

describe('getExpirationDate', () => {
  it('should return null when expiresIn is null', () => {
    expect(getExpirationDate(null)).toBeNull();
  });

  it('should return null when expiresIn is undefined', () => {
    expect(getExpirationDate(undefined)).toBeNull();
  });

  it('should return null when expiresIn is empty string', () => {
    expect(getExpirationDate('')).toBeNull();
  });

  it('should return a future Date for valid duration string', () => {
    const before = Date.now();
    const result = getExpirationDate('1h');
    const after = Date.now();

    expect(result).toBeInstanceOf(Date);

    const oneHourMs = 60 * 60 * 1000;
    expect(result!.getTime()).toBeGreaterThanOrEqual(before + oneHourMs);
    expect(result!.getTime()).toBeLessThanOrEqual(after + oneHourMs);
  });

  it('should handle day duration', () => {
    const before = Date.now();
    const result = getExpirationDate('2d');

    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    expect(result!.getTime()).toBeGreaterThanOrEqual(before + twoDaysMs);
  });

  it('should throw for invalid format', () => {
    expect(() => getExpirationDate('invalid')).toThrow();
  });

  it('should default to a client fault for an unparseable value', () => {
    try {
      getExpirationDate('invalid');
      throw new Error('Expected a throw');
    } catch (e) {
      expect((e as RuntimeException).fault).toBe('client');
    }
  });

  it('should use the fault passed by the caller', () => {
    try {
      getExpirationDate('invalid', 'usage');
      throw new Error('Expected a throw');
    } catch (e) {
      expect((e as RuntimeException).fault).toBe('usage');
    }
  });
});
