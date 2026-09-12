import { getExpirationDate } from '../utils/get-expiration-date.util.js';

export interface CacheExpirationSettings {
  expiresIn?: string | null;
}

const DEFAULTS: Required<CacheExpirationSettings> = {
  expiresIn: null,
};

export class CacheExpirationPolicy {
  private readonly settings: Required<CacheExpirationSettings>;

  constructor(settings?: CacheExpirationSettings) {
    this.settings = { ...DEFAULTS, ...settings };
  }

  get defaultExpiresIn(): string | null {
    return this.settings.expiresIn ?? null;
  }

  resolveExpirationDate(expiresIn?: string | null): Date | null {
    // A malformed client-supplied value is the caller's mistake; falling
    // through to a malformed module-configured default is ours.
    return getExpirationDate(
      expiresIn ?? this.defaultExpiresIn,
      expiresIn ? 'client' : 'usage',
    );
  }
}
