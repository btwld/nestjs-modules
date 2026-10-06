export interface PasswordPolicySettings {
  reuseAfterDays?: number;
  requireCurrent?: boolean;
}

const DEFAULTS: Required<PasswordPolicySettings> = {
  reuseAfterDays: 0,
  requireCurrent: false,
};

export class UserPasswordPolicy {
  private readonly settings: Required<PasswordPolicySettings>;

  constructor(settings?: PasswordPolicySettings) {
    this.settings = { ...DEFAULTS, ...settings };
  }

  get reuseRestricted(): boolean {
    return this.settings.reuseAfterDays > 0;
  }

  get requireCurrent(): boolean {
    return this.settings.requireCurrent;
  }

  get reuseLimitDate(): Date | undefined {
    if (!this.reuseRestricted) return undefined;

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - this.settings.reuseAfterDays);
    return limitDate;
  }
}
