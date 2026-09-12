import { type Provider } from '@nestjs/common';

import { JwtStrategyPolicy } from '../../domain/policies/jwt-strategy.policy.js';
import {
  authenticationDefaultConfig,
  type AuthenticationModuleDefaultsInterface,
} from '../config/authentication-default.config.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createJwtStrategyPolicyProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: JwtStrategyPolicy,
    inject: [rawOptionsToken, authenticationDefaultConfig.KEY],
    useFactory: (
      options: AuthenticationOptionsInterface,
      defaults: AuthenticationModuleDefaultsInterface,
    ) =>
      new JwtStrategyPolicy({
        ...defaults.strategies.jwt,
        ...(options.settings?.strategies?.jwt ?? {}),
      }),
  };
}
