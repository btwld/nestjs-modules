import { type Provider } from '@nestjs/common';

import { LocalService } from '../../application/services/local/local.service.js';
import { LocalStrategyPolicy } from '../../domain/policies/local-strategy.policy.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';
import { AuthenticationFeatureConfigException } from '../exceptions/authentication-feature-config.exception.js';
import { LocalStrategy } from '../strategies/local/local.strategy.js';

export function createLocalStrategyProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: LocalStrategy,
    inject: [
      rawOptionsToken,
      LocalStrategyPolicy,
      { token: LocalService, optional: true },
    ],
    useFactory: (
      options: AuthenticationOptionsInterface,
      localPolicy: LocalStrategyPolicy,
      validateUserService: LocalService | null,
    ) => {
      if (!options.settings?.strategies?.local) return null;
      if (!validateUserService) {
        throw new AuthenticationFeatureConfigException('local strategy', [
          'UserPort',
          'PasswordPort',
        ]);
      }
      return new LocalStrategy(localPolicy, validateUserService);
    },
  };
}
