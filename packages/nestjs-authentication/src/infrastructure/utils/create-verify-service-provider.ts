import { type Provider } from '@nestjs/common';

import { VerifyService } from '../../application/services/verify/verify.service.js';
import {
  AUTHENTICATION_OTP_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
  AUTHENTICATION_VERIFY_NOTIFICATION_PORT_TOKEN,
} from '../../authentication.constants.js';
import { VerifyPolicy } from '../../domain/policies/verify.policy.js';
import { type OtpPort } from '../../domain/ports/otp.port.js';
import { type UserPort } from '../../domain/ports/user.port.js';
import { type VerifyNotificationPort } from '../../domain/ports/verify-notification.port.js';
import { type AuthenticationOptionsInterface } from '../config/interfaces/authentication-options.interface.js';
import { AuthenticationFeatureConfigException } from '../exceptions/authentication-feature-config.exception.js';

export function createVerifyServiceProvider(rawOptionsToken: symbol): Provider {
  return {
    provide: VerifyService,
    inject: [
      rawOptionsToken,
      VerifyPolicy,
      { token: AUTHENTICATION_OTP_PORT_TOKEN, optional: true },
      { token: AUTHENTICATION_USER_PORT_TOKEN, optional: true },
      { token: AUTHENTICATION_VERIFY_NOTIFICATION_PORT_TOKEN, optional: true },
    ],
    useFactory: (
      options: AuthenticationOptionsInterface,
      verifyPolicy: VerifyPolicy,
      otpPort: OtpPort | null,
      userPort: UserPort | null,
      verifyNotificationPort: VerifyNotificationPort | null,
    ) => {
      if (!options.settings?.mfa?.verify) return null;
      if (!otpPort || !userPort || !verifyNotificationPort) {
        const missing = [
          !otpPort && 'OtpPort',
          !userPort && 'UserPort',
          !verifyNotificationPort && 'VerifyNotificationPort',
        ].filter((m): m is string => Boolean(m));
        throw new AuthenticationFeatureConfigException('mfa.verify', missing);
      }
      return new VerifyService(
        verifyPolicy,
        otpPort,
        userPort,
        verifyNotificationPort,
      );
    },
  };
}
