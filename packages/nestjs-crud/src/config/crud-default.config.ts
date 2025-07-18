import { registerAs } from '@nestjs/config';

import {
  CRUD_MODULE_DEFAULT_SETTINGS_TOKEN,
  CRUD_MODULE_DEFAULT_TRANSFORM_OPTIONS,
} from '../crud.constants';
import { CrudModuleSettingsInterface } from '../interfaces/crud-module-settings.interface';

/**
 * Default configuration for crud.
 */
export const crudDefaultConfig = registerAs(
  CRUD_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): CrudModuleSettingsInterface => ({
    serialization: {
      toInstanceOptions: CRUD_MODULE_DEFAULT_TRANSFORM_OPTIONS,
      toPlainOptions: CRUD_MODULE_DEFAULT_TRANSFORM_OPTIONS,
    },
  }),
);
