import { type Provider } from '@nestjs/common';

import { OtpPolicy } from '../../domain/policies/otp.policy.js';
import { OTP_MODULE_SETTINGS_TOKEN } from '../../otp.constants.js';
import { type OtpSettingsInterface } from '../config/interfaces/otp-settings.interface.js';

export function createOtpPolicyProvider(): Provider {
  return {
    provide: OtpPolicy,
    inject: [OTP_MODULE_SETTINGS_TOKEN],
    useFactory: (settings: OtpSettingsInterface) => new OtpPolicy(settings),
  };
}
