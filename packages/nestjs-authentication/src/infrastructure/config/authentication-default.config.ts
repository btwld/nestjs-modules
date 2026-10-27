import { ExtractJwt } from 'passport-jwt';

import { registerAs } from '@nestjs/config';

import { localLoginSchema } from '../strategies/local/schemas/local-login.schema.js';

import {
  type AuthenticationMfaSettingsInterface,
  type AuthenticationStrategiesSettingsInterface,
} from './interfaces/authentication-settings.interface.js';

export const AUTHENTICATION_MODULE_DEFAULTS_TOKEN =
  'AUTHENTICATION_MODULE_DEFAULTS_TOKEN';

export interface AuthenticationModuleDefaultsInterface {
  strategies: Required<AuthenticationStrategiesSettingsInterface>;
  mfa: Required<AuthenticationMfaSettingsInterface>;
}

/**
 * Default configuration for the authentication module.
 */
export const authenticationDefaultConfig = registerAs(
  AUTHENTICATION_MODULE_DEFAULTS_TOKEN,
  (): AuthenticationModuleDefaultsInterface => ({
    strategies: {
      jwt: {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      },
      local: {
        loginSchema: localLoginSchema,
        usernameField: process.env['AUTH_LOCAL_USERNAME_FIELD'] ?? 'username',
        passwordField: process.env['AUTH_LOCAL_PASSWORD_FIELD'] ?? 'password',
      },
      refresh: {
        jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      },
    },
    mfa: {
      recovery: {
        otp: {
          namespace: 'userOtp',
          category: 'auth-recovery',
          type: 'uuid',
          expiresIn: '1h',
          duplicateStrategy: 'DEACTIVATE',
          rateSeconds: 60,
          rateThreshold: 5,
        },
      },
      verify: {
        otp: {
          namespace: 'userOtp',
          category: 'auth-verify',
          type: 'uuid',
          expiresIn: '24h',
          duplicateStrategy: 'DEACTIVATE',
          rateSeconds: 60,
          rateThreshold: 5,
        },
      },
    },
  }),
);
