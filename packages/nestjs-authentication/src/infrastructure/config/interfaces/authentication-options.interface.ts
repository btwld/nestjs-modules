import { type JwtPortSettings } from '../../../domain/ports/jwt.port.js';
import { type OtpPortSettings } from '../../../domain/ports/otp.port.js';
import { type PasswordPortSettings } from '../../../domain/ports/password.port.js';
import { type RecoveryNotificationPortSettings } from '../../../domain/ports/recovery-notification.port.js';
import { type TokenPortSettings } from '../../../domain/ports/token.port.js';
import { type UserPortSettings } from '../../../domain/ports/user.port.js';
import { type VerifyNotificationPortSettings } from '../../../domain/ports/verify-notification.port.js';

import { type AuthenticationSettingsInterface } from './authentication-settings.interface.js';

export interface AuthenticationPortsInterface {
  jwt?: JwtPortSettings;
  token?: TokenPortSettings;
  user: UserPortSettings;
  password: PasswordPortSettings;
  otp: OtpPortSettings;
  recoveryNotification: RecoveryNotificationPortSettings;
  verifyNotification: VerifyNotificationPortSettings;
}

/**
 * Authentication module configuration options interface
 */
export interface AuthenticationOptionsInterface {
  settings?: AuthenticationSettingsInterface;
  ports?: AuthenticationPortsInterface;
}
