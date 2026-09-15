export interface OtpPolicySettingsInterface {
  otp: {
    category: string;
    namespace: string;
    type: string;
    expiresIn: string;
    duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
    rateSeconds?: number;
    rateThreshold?: number;
  };
}

export class OtpPolicy {
  readonly otpCategory: string;
  readonly otpNamespace: string;
  readonly otpType: string;
  readonly otpExpiresIn: string;
  readonly otpDuplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
  readonly otpRateSeconds: number;
  readonly otpRateThreshold: number;

  constructor(settings: OtpPolicySettingsInterface) {
    const { otp } = settings;

    this.otpCategory = otp.category;
    this.otpNamespace = otp.namespace;
    this.otpType = otp.type;
    this.otpExpiresIn = otp.expiresIn;
    this.otpDuplicateStrategy = otp.duplicateStrategy;
    this.otpRateSeconds = otp.rateSeconds ?? 0;
    this.otpRateThreshold = otp.rateThreshold ?? 0;

    if (this.otpRateSeconds === 0 && this.otpRateThreshold === 0) {
      process.emitWarning(
        `OTP rate limiting is disabled for category "${this.otpCategory}". ` +
          'Set rateSeconds and rateThreshold to prevent brute-force attacks.',
        { code: 'ROCKETS_OTP_NO_RATE_LIMIT' },
      );
    }
  }
}
