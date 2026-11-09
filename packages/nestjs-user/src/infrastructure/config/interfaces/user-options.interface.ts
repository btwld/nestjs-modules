import { type UserPasswordPortSettings } from '../../../domain/ports/user-password.port.js';

import { type UserSettingsInterface } from './user-settings.interface.js';

export interface UserOptionsInterface {
  settings?: UserSettingsInterface;
  ports?: {
    password?: UserPasswordPortSettings;
  };
}
