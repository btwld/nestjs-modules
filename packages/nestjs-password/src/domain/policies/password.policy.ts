import { PasswordStrengthEnum } from '../enum/password-strength.enum.js';

export interface PasswordPolicySettings {
  minPasswordStrength?: PasswordStrengthEnum;
  requireCurrentToUpdate?: boolean;
}

const DEFAULTS: Required<PasswordPolicySettings> = {
  minPasswordStrength: PasswordStrengthEnum.None,
  requireCurrentToUpdate: false,
};

export class PasswordPolicy {
  private readonly settings: Required<PasswordPolicySettings>;

  constructor(settings?: PasswordPolicySettings) {
    this.settings = { ...DEFAULTS, ...settings };
  }

  get minPasswordStrength(): PasswordStrengthEnum {
    return this.settings.minPasswordStrength;
  }

  get requireCurrentToUpdate(): boolean {
    return this.settings.requireCurrentToUpdate;
  }
}
