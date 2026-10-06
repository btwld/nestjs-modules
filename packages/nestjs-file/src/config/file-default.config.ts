import { registerAs } from '@nestjs/config';

import { FILE_MODULE_DEFAULT_SETTINGS_TOKEN } from '../file.constants';
import { type FileSettingsInterface } from '../interfaces/file-settings.interface';

/**
 * Default configuration for file module.
 */
export const fileDefaultConfig = registerAs(
  FILE_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): FileSettingsInterface => ({}),
);
