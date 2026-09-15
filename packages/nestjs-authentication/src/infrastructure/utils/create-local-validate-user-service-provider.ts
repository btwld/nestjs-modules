import { type Provider } from '@nestjs/common';

import { LocalService } from '../../application/services/local/local.service.js';
import {
  AUTHENTICATION_USER_PORT_TOKEN,
  AUTHENTICATION_PASSWORD_PORT_TOKEN,
} from '../../authentication.constants.js';
import { type PasswordPort } from '../../domain/ports/password.port.js';
import { type UserPort } from '../../domain/ports/user.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';
import { AuthenticationFeatureConfigException } from '../exceptions/authentication-feature-config.exception.js';

export function createLocalValidateUserServiceProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: LocalService,
    inject: [
      rawOptionsToken,
      { token: AUTHENTICATION_USER_PORT_TOKEN, optional: true },
      { token: AUTHENTICATION_PASSWORD_PORT_TOKEN, optional: true },
    ],
    useFactory: (
      options: AuthenticationOptionsInterface,
      userPort: UserPort | null,
      passwordPort: PasswordPort | null,
    ) => {
      if (!options.settings?.strategies?.local) return null;
      if (!userPort || !passwordPort) {
        const missing = [
          !userPort && 'UserPort',
          !passwordPort && 'PasswordPort',
        ].filter((m): m is string => Boolean(m));
        throw new AuthenticationFeatureConfigException(
          'local strategy',
          missing,
        );
      }
      return new LocalService(userPort, passwordPort);
    },
  };
}
