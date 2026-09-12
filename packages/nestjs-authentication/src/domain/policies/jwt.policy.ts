import ms from 'ms';

import { type TokenOptionsInterface } from '../interfaces/token-options.interface.js';

export interface JwtPolicySettingsInterface {
  access?: TokenOptionsInterface;
  refresh?: TokenOptionsInterface;
}

export class JwtPolicy {
  readonly access: TokenOptionsInterface;
  readonly refresh: TokenOptionsInterface;

  constructor(settings: JwtPolicySettingsInterface) {
    const { access = {}, refresh = {} } = settings;

    this.access = access;
    this.refresh = refresh;

    const minLength = 32;
    const { secret: accessSecret } = access;
    const { secret: refreshSecret } = refresh;

    if (typeof accessSecret === 'string' && accessSecret.length < minLength) {
      process.emitWarning(
        `JWT access token secret is shorter than ${minLength} characters. Use at least ${minLength} characters for HS256.`,
        { code: 'ROCKETS_JWT_WEAK_SECRET' },
      );
    }

    if (typeof refreshSecret === 'string' && refreshSecret.length < minLength) {
      process.emitWarning(
        `JWT refresh token secret is shorter than ${minLength} characters. Use at least ${minLength} characters for HS256.`,
        { code: 'ROCKETS_JWT_WEAK_SECRET' },
      );
    }

    if (accessSecret !== undefined && accessSecret === refreshSecret) {
      process.emitWarning(
        'JWT access and refresh token secrets are identical. Use separate secrets to prevent token type confusion attacks.',
        { code: 'ROCKETS_JWT_SHARED_SECRET' },
      );
    }

    if (!access.signOptions?.expiresIn) {
      process.emitWarning(
        'JWT access token expiresIn is not set. Defaulting to 1h. Set signOptions.expiresIn explicitly (e.g. "15m").',
        { code: 'ROCKETS_JWT_NO_EXPIRY' },
      );
    }

    if (!refresh.signOptions?.expiresIn) {
      process.emitWarning(
        'JWT refresh token expiresIn is not set. Defaulting to 24h. Set signOptions.expiresIn explicitly (e.g. "7d").',
        { code: 'ROCKETS_JWT_NO_EXPIRY' },
      );
    }
  }

  getAccessExpiry(from: Date = new Date()): Date {
    return this.computeExpiry(this.access, 60 * 60 * 1000, from);
  }

  getRefreshExpiry(from: Date = new Date()): Date {
    return this.computeExpiry(this.refresh, 24 * 60 * 60 * 1000, from);
  }

  private computeExpiry(
    options: TokenOptionsInterface,
    defaultTtlMs: number,
    from: Date,
  ): Date {
    const expiresIn = options.signOptions?.expiresIn;
    let ttlMs: number;
    if (typeof expiresIn === 'number') {
      ttlMs = expiresIn * 1000;
    } else if (expiresIn !== undefined) {
      ttlMs = ms(expiresIn);
    } else {
      ttlMs = defaultTtlMs;
    }
    return new Date(from.getTime() + ttlMs);
  }
}
