import { registerAs } from '@nestjs/config';

import { CRUD_MODULE_DEFAULT_SETTINGS_TOKEN } from '../../crud.constants.js';

import { type CrudModuleSettingsInterface } from './interfaces/crud-module-settings.interface.js';

/**
 * Default configuration for crud.
 */
export const crudDefaultConfig = registerAs(
  CRUD_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): CrudModuleSettingsInterface => ({}),
);
