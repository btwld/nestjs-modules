import { type Provider } from '@nestjs/common';

import {
  AUTHENTICATION_JWT_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../../authentication.constants.js';
import { RefreshStrategyPolicy } from '../../domain/policies/refresh-strategy.policy.js';
import { type JwtPort } from '../../domain/ports/jwt.port.js';
import { type UserPort } from '../../domain/ports/user.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';
import { AuthenticationFeatureConfigException } from '../exceptions/authentication-feature-config.exception.js';
import { RefreshStrategy } from '../strategies/refresh/refresh.strategy.js';

export function createRefreshStrategyProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: RefreshStrategy,
    inject: [
      rawOptionsToken,
      RefreshStrategyPolicy,
      AUTHENTICATION_JWT_PORT_TOKEN,
      { token: AUTHENTICATION_USER_PORT_TOKEN, optional: true },
    ],
    useFactory: (
      options: AuthenticationOptionsInterface,
      refreshPolicy: RefreshStrategyPolicy,
      jwtPort: JwtPort,
      userPort: UserPort | null,
    ) => {
      if (!options.settings?.strategies?.refresh) return null;
      if (!options.settings?.jwt) {
        throw new AuthenticationFeatureConfigException('refresh strategy', [
          'jwt token config',
        ]);
      }
      if (!userPort) {
        throw new AuthenticationFeatureConfigException('refresh strategy', [
          'UserPort',
        ]);
      }
      return new RefreshStrategy(refreshPolicy, jwtPort, userPort);
    },
  };
}
