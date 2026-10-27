import { registerAs } from '@nestjs/config';

import {
  USER_MODULE_DEFAULT_SETTINGS_TOKEN,
  USER_MODULE_USER_PASSWORD_REUSE_AFTER_DAYS_DEFAULT,
} from '../../user.constants.js';

import { type UserSettingsInterface } from './interfaces/user-settings.interface.js';

export const userDefaultConfig = registerAs(
  USER_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): UserSettingsInterface => {
    const reuseAfterDays = process.env?.USER_PASSWORD_REUSE_AFTER_DAYS?.length
      ? Number(process.env?.USER_PASSWORD_REUSE_AFTER_DAYS)
      : USER_MODULE_USER_PASSWORD_REUSE_AFTER_DAYS_DEFAULT;

    const requireCurrent =
      process.env?.USER_PASSWORD_REQUIRE_CURRENT === 'true';

    return {
      password: {
        reuseAfterDays:
          isNaN(reuseAfterDays) || reuseAfterDays < 1
            ? undefined
            : reuseAfterDays,
        requireCurrent,
      },
    };
  },
);
