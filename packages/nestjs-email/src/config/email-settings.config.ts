import { registerAs } from '@nestjs/config';

import { type EmailSettingsInterface } from '../interfaces/email-settings.interface';

/**
 * Get email settings from environment variables.
 */
export const emailSettingsConfig = registerAs(
  'EMAIL_MODULE_DEFAULT_SETTINGS_TOKEN',
  (): EmailSettingsInterface => ({}),
);
