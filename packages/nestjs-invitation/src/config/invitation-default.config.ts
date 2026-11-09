import { registerAs } from '@nestjs/config';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type InvitationSettingsInterface } from '../interfaces/options/invitation-settings.interface.js';
import { INVITATION_MODULE_DEFAULT_SETTINGS_TOKEN } from '../invitation.constants.js';

/**
 * Default configuration for invitation.
 *
 * External port command/query types must be provided by the consumer
 * through module options. These defaults only cover scalar settings.
 */
export const invitationDefaultConfig = registerAs(
  INVITATION_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): DeepPartial<InvitationSettingsInterface> => ({
    otp: {
      namespace: 'user-otp',
      type: 'uuid',
      expiresIn: '7d',
      clearOtpOnCreate: process.env.INVITATION_OTP_CLEAR_ON_CREATE
        ? process.env.INVITATION_OTP_CLEAR_ON_CREATE === 'true'
        : false,
    },
  }),
);
