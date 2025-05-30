import { registerAs } from '@nestjs/config';

import { ExtractJwt } from '@concepta/nestjs-jwt';

import { AUTH_REFRESH_MODULE_DEFAULT_SETTINGS_TOKEN } from '../auth-refresh.constants';
import { AuthRefreshSettingsInterface } from '../interfaces/auth-refresh-settings.interface';

/**
 * Default configuration for auth refresh.
 */
export const authRefreshDefaultConfig = registerAs(
  AUTH_REFRESH_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): Partial<AuthRefreshSettingsInterface> => ({
    jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
  }),
);
