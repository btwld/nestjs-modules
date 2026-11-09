import { registerAs } from '@nestjs/config';

import { FILE_MODULE_DEFAULT_SETTINGS_TOKEN } from '../../file.constants.js';

import { type FileSettingsInterface } from './interfaces/file-settings.interface.js';

export const fileDefaultConfig = registerAs(
  FILE_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): FileSettingsInterface => ({}),
);
