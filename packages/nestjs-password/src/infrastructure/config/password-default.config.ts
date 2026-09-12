import { registerAs } from '@nestjs/config';

import { PasswordStrengthEnum } from '../../domain/enum/password-strength.enum.js';
import { PASSWORD_MODULE_DEFAULT_SETTINGS_TOKEN } from '../../password.constants.js';

import { type PasswordSettingsInterface } from './interfaces/password-settings.interface.js';

/**
 * Default password settings configuration.
 */
export const passwordDefaultConfig = registerAs(
  PASSWORD_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): PasswordSettingsInterface => ({
    minPasswordStrength: process.env.PASSWORD_MIN_PASSWORD_STRENGTH
      ? Number.parseInt(process.env.PASSWORD_MIN_PASSWORD_STRENGTH, 10) ||
        PasswordStrengthEnum.None
      : process.env?.NODE_ENV === 'production'
        ? PasswordStrengthEnum.VeryStrong
        : PasswordStrengthEnum.None,

    requireCurrentToUpdate:
      process.env?.PASSWORD_REQUIRE_CURRENT_TO_UPDATE === 'true' ? true : false,
  }),
);
