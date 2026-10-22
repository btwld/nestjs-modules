import { type Provider } from '@nestjs/common';

import { InvitationOtpPolicy } from '../../domain/policies/invitation-otp.policy.js';
import { type InvitationSettingsInterface } from '../../interfaces/options/invitation-settings.interface.js';
import { INVITATION_MODULE_SETTINGS_TOKEN } from '../../invitation.constants.js';

export function createInvitationOtpPolicyProvider(): Provider {
  return {
    provide: InvitationOtpPolicy,
    inject: [INVITATION_MODULE_SETTINGS_TOKEN],
    useFactory: (settings: InvitationSettingsInterface) =>
      new InvitationOtpPolicy(settings.otp),
  };
}
