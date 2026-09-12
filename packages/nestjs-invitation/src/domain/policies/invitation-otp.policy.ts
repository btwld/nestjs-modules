import { type InvitationOtpSettingsInterface } from '../interfaces/invitation-otp-settings.interface.js';

export class InvitationOtpPolicy {
  readonly namespace: string;
  readonly type: string;
  readonly expiresIn: string;
  readonly clearOtpOnCreate: boolean;
  readonly rateSeconds: number;
  readonly rateThreshold: number;

  constructor(settings: InvitationOtpSettingsInterface) {
    const {
      namespace,
      type,
      expiresIn,
      clearOtpOnCreate = false,
      rateSeconds = 0,
      rateThreshold = 0,
    } = settings;

    this.namespace = namespace;
    this.type = type;
    this.expiresIn = expiresIn;
    this.clearOtpOnCreate = clearOtpOnCreate;
    this.rateSeconds = rateSeconds;
    this.rateThreshold = rateThreshold;
  }
}
