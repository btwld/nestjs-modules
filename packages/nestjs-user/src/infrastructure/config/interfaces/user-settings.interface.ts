import { type PasswordPolicySettings } from '../../../domain/policies/user-password.policy.js';

export interface UserSettingsInterface {
  password?: PasswordPolicySettings;
}
