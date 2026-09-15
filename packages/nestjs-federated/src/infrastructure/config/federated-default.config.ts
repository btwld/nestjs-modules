import { registerAs } from '@nestjs/config';

import { FEDERATED_MODULE_DEFAULT_SETTINGS_TOKEN } from '../../federated.constants.js';

import { type FederatedSettingsInterface } from './interfaces/federated-settings.interface.js';

export const federatedDefaultConfig = registerAs(
  FEDERATED_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): FederatedSettingsInterface => ({}),
);
