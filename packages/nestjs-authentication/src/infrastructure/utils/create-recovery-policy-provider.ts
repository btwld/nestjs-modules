import { type Provider } from '@nestjs/common';

import { RecoveryPolicy } from '../../domain/policies/recovery.policy.js';
import {
  authenticationDefaultConfig,
  type AuthenticationModuleDefaultsInterface,
} from '../config/authentication-default.config.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';

export function createRecoveryPolicyProvider(
  rawOptionsToken: symbol,
): Provider {
  return {
    provide: RecoveryPolicy,
    inject: [rawOptionsToken, authenticationDefaultConfig.KEY],
    useFactory: (
      options: AuthenticationOptionsInterface,
      defaults: AuthenticationModuleDefaultsInterface,
    ) =>
      new RecoveryPolicy({
        ...defaults.mfa.recovery,
        ...(options.settings?.mfa?.recovery ?? {}),
      }),
  };
}
