import { registerAs } from '@nestjs/config';

import { EVENT_MODULE_DEFAULT_EMITTER_SERVICE_SETTINGS_TOKEN } from '../event-constants';
import { type EventSettingsInterface } from '../interfaces/event-settings.interface';

/**
 * Get event settings config from environment variables.
 */
export const eventSettingsConfig = registerAs(
  EVENT_MODULE_DEFAULT_EMITTER_SERVICE_SETTINGS_TOKEN,
  (): EventSettingsInterface => ({}),
);
