import { type Provider } from '@nestjs/common';

import { CACHE_MODULE_SETTINGS_TOKEN } from '../../cache.constants.js';
import { CacheExpirationPolicy } from '../../domain/policies/cache-expiration.policy.js';
import { type CacheSettingsInterface } from '../config/interfaces/cache-settings.interface.js';

export function createCacheExpirationPolicyProvider(): Provider {
  return {
    provide: CacheExpirationPolicy,
    inject: [CACHE_MODULE_SETTINGS_TOKEN],
    useFactory: (settings: CacheSettingsInterface) =>
      new CacheExpirationPolicy(settings),
  };
}
