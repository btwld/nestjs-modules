import { type Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { type AuthenticationOptionsExtrasInterface } from '../config/interfaces/authentication-options-extras.interface.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';
import { JwtGuard } from '../strategies/jwt/jwt.guard.js';

export function createJwtAppGuardProvider(
  rawOptionsToken: symbol,
  extras: AuthenticationOptionsExtrasInterface,
): Provider {
  return {
    provide: APP_GUARD,
    inject: [rawOptionsToken, JwtGuard],
    useFactory: (
      options: AuthenticationOptionsInterface,
      defaultGuard: JwtGuard,
    ) => {
      if (!options.settings?.strategies?.jwt) return null;
      if (extras.appGuard === false) return null;
      return extras.appGuard ?? defaultGuard;
    },
  };
}
