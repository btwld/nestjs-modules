import { OtpPolicy, type OtpPolicySettingsInterface } from './otp.policy.js';

export interface VerifyPolicySettingsInterface extends OtpPolicySettingsInterface {}

export class VerifyPolicy extends OtpPolicy {
  constructor(settings: VerifyPolicySettingsInterface) {
    super(settings);
  }
}
