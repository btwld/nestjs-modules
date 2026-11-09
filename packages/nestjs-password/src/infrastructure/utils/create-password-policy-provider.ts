import { type Provider } from '@nestjs/common';

import { PasswordPolicy } from '../../domain/policies/password.policy.js';
import { PASSWORD_MODULE_SETTINGS_TOKEN } from '../../password.constants.js';
import { type PasswordSettingsInterface } from '../config/interfaces/password-settings.interface.js';

export function createPasswordPolicyProvider(): Provider {
  return {
    provide: PasswordPolicy,
    inject: [PASSWORD_MODULE_SETTINGS_TOKEN],
    useFactory: (settings: PasswordSettingsInterface) =>
      new PasswordPolicy(settings),
  };
}
