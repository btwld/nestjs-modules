import { type ModuleOptionsControllerInterface } from '@concepta/nestjs-core';

import { type InvitationNotificationPortSettings } from '../../domain/ports/invitation-notification.port.js';
import { type InvitationOtpPortSettings } from '../../domain/ports/invitation-otp.port.js';
import { type InvitationUserPortSettings } from '../../domain/ports/invitation-user.port.js';

import { type InvitationSettingsInterface } from './invitation-settings.interface.js';

export interface InvitationPortsInterface {
  otp: InvitationOtpPortSettings;
  user: InvitationUserPortSettings;
  notification: InvitationNotificationPortSettings;
}

export interface InvitationOptionsInterface extends ModuleOptionsControllerInterface {
  settings?: InvitationSettingsInterface;
  ports: InvitationPortsInterface;
}
