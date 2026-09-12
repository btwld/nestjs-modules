import { OtpPolicy, type OtpPolicySettingsInterface } from './otp.policy.js';

export interface RecoveryPolicySettingsInterface extends OtpPolicySettingsInterface {}

export class RecoveryPolicy extends OtpPolicy {
  constructor(settings: RecoveryPolicySettingsInterface) {
    super(settings);
  }
}
