import { type Provider } from '@nestjs/common';

import { RefreshStrategyPolicy } from '../../domain/policies/refresh-strategy.policy.js';
import {
  authenticationDefaultConfig,
  type AuthenticationModuleDefaultsInterface,
} from '../config/authentication-default.config.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createRefreshStrategyPolicyProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: RefreshStrategyPolicy,
    inject: [rawOptionsToken, authenticationDefaultConfig.KEY],
    useFactory: (
      options: AuthenticationOptionsInterface,
      defaults: AuthenticationModuleDefaultsInterface,
    ) =>
      new RefreshStrategyPolicy({
        ...defaults.strategies.refresh,
        ...(options.settings?.strategies?.refresh ?? {}),
      }),
  };
}
