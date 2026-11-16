import { type MockInstance } from 'vitest';

import { JwtPolicy } from '../jwt.policy.js';

describe(JwtPolicy.name, () => {
  let emitWarningSpy: MockInstance<typeof process.emitWarning>;

  beforeEach(() => {
    emitWarningSpy = vi
      .spyOn(process, 'emitWarning')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    emitWarningSpy.mockRestore();
  });

  const strongSecret = 'a'.repeat(32);
  const otherStrongSecret = 'b'.repeat(32);

  describe('construction', () => {
    it('should default to empty options when none provided', () => {
      const policy = new JwtPolicy({});

      expect(policy.access).toEqual({});
      expect(policy.refresh).toEqual({});
    });

    it('should expose provided access and refresh options', () => {
      const policy = new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      expect(policy.access).toEqual({
        secret: strongSecret,
        signOptions: { expiresIn: '15m' },
      });
      expect(policy.refresh).toEqual({
        secret: otherStrongSecret,
        signOptions: { expiresIn: '7d' },
      });
    });
  });

  describe('security warnings', () => {
    it('should warn when access secret is shorter than 32 characters', () => {
      new JwtPolicy({
        access: { secret: 'short', signOptions: { expiresIn: '15m' } },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      expect(emitWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT access token secret is shorter than 32'),
        { code: 'ROCKETS_JWT_WEAK_SECRET' },
      );
    });

    it('should warn when refresh secret is shorter than 32 characters', () => {
      new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: { secret: 'short', signOptions: { expiresIn: '7d' } },
      });

      expect(emitWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT refresh token secret is shorter than 32'),
        { code: 'ROCKETS_JWT_WEAK_SECRET' },
      );
    });

    it('should warn when access and refresh secrets are identical', () => {
      new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: { secret: strongSecret, signOptions: { expiresIn: '7d' } },
      });

      expect(emitWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'JWT access and refresh token secrets are identical',
        ),
        { code: 'ROCKETS_JWT_SHARED_SECRET' },
      );
    });

    it('should not warn about shared secrets when both are undefined', () => {
      new JwtPolicy({
        access: { signOptions: { expiresIn: '15m' } },
        refresh: { signOptions: { expiresIn: '7d' } },
      });

      const sharedCalls = emitWarningSpy.mock.calls.filter(
        ([, opts]) => opts?.code === 'ROCKETS_JWT_SHARED_SECRET',
      );
      expect(sharedCalls).toHaveLength(0);
    });

    it('should warn when access expiresIn is not set', () => {
      new JwtPolicy({
        access: { secret: strongSecret },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      expect(emitWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'JWT access token expiresIn is not set. Defaulting to 1h',
        ),
        { code: 'ROCKETS_JWT_NO_EXPIRY' },
      );
    });

    it('should warn when refresh expiresIn is not set', () => {
      new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: { secret: otherStrongSecret },
      });

      expect(emitWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'JWT refresh token expiresIn is not set. Defaulting to 24h',
        ),
        { code: 'ROCKETS_JWT_NO_EXPIRY' },
      );
    });

    it('should not warn when secrets are strong and expiresIn is set', () => {
      new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      expect(emitWarningSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAccessExpiry', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    it('should default to 1 hour when expiresIn is not set', () => {
      const policy = new JwtPolicy({
        access: { secret: strongSecret },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      const expiry = policy.getAccessExpiry(now);

      expect(expiry.getTime() - now.getTime()).toBe(60 * 60 * 1000);
    });

    it('should multiply numeric expiresIn by 1000 (seconds)', () => {
      const policy = new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: 900 } },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      const expiry = policy.getAccessExpiry(now);

      expect(expiry.getTime() - now.getTime()).toBe(900 * 1000);
    });

    it('should parse string expiresIn via ms()', () => {
      const policy = new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '30m' } },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      const expiry = policy.getAccessExpiry(now);

      expect(expiry.getTime() - now.getTime()).toBe(30 * 60 * 1000);
    });
  });

  describe('getRefreshExpiry', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    it('should default to 24 hours when expiresIn is not set', () => {
      const policy = new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: { secret: otherStrongSecret },
      });

      const expiry = policy.getRefreshExpiry(now);

      expect(expiry.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it('should multiply numeric expiresIn by 1000 (seconds)', () => {
      const policy = new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: 604800 },
        },
      });

      const expiry = policy.getRefreshExpiry(now);

      expect(expiry.getTime() - now.getTime()).toBe(604800 * 1000);
    });

    it('should parse string expiresIn via ms()', () => {
      const policy = new JwtPolicy({
        access: { secret: strongSecret, signOptions: { expiresIn: '15m' } },
        refresh: {
          secret: otherStrongSecret,
          signOptions: { expiresIn: '7d' },
        },
      });

      const expiry = policy.getRefreshExpiry(now);

      expect(expiry.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});
