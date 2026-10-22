import { type Provider } from '@nestjs/common';

import { VerifyPolicy } from '../../domain/policies/verify.policy.js';
import {
  authenticationDefaultConfig,
  type AuthenticationModuleDefaultsInterface,
} from '../config/authentication-default.config.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createVerifyPolicyProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: VerifyPolicy,
    inject: [rawOptionsToken, authenticationDefaultConfig.KEY],
    useFactory: (
      options: AuthenticationOptionsInterface,
      defaults: AuthenticationModuleDefaultsInterface,
    ) =>
      new VerifyPolicy({
        ...defaults.mfa.verify,
        ...(options.settings?.mfa?.verify ?? {}),
      }),
  };
}
