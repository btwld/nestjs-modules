import { type Provider } from '@nestjs/common';

import { LocalStrategyPolicy } from '../../domain/policies/local-strategy.policy.js';
import {
  authenticationDefaultConfig,
  type AuthenticationModuleDefaultsInterface,
} from '../config/authentication-default.config.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createLocalStrategyPolicyProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: LocalStrategyPolicy,
    inject: [rawOptionsToken, authenticationDefaultConfig.KEY],
    useFactory: (
      options: AuthenticationOptionsInterface,
      defaults: AuthenticationModuleDefaultsInterface,
    ) =>
      new LocalStrategyPolicy({
        ...defaults.strategies.local,
        ...(options.settings?.strategies?.local ?? {}),
      }),
  };
}
