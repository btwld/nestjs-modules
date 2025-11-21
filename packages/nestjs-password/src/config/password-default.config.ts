import { registerAs } from '@nestjs/config';

import { PasswordSettingsInterface } from '../interfaces/password-settings.interface';
import { PASSWORD_MODULE_DEFAULT_SETTINGS_TOKEN } from '../password.constants';

/**
 * Default password settings configuration.
 */
export const passwordDefaultConfig = registerAs(
  PASSWORD_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): PasswordSettingsInterface => ({
    maxPasswordAttempts: process.env.PASSWORD_MAX_PASSWORD_ATTEMPTS
      ? Number.parseInt(process.env.PASSWORD_MAX_PASSWORD_ATTEMPTS)
      : 3,

    minPasswordStrength: process.env.PASSWORD_MIN_PASSWORD_STRENGTH
      ? Number.parseInt(process.env.PASSWORD_MIN_PASSWORD_STRENGTH)
      : process.env?.NODE_ENV === 'production'
        ? 4
        : 0,

    requireCurrentToUpdate:
      process.env?.PASSWORD_REQUIRE_CURRENT_TO_UPDATE === 'true' ? true : false,
  }),
);
