import {
  RecoveryPolicy,
  type RecoveryPolicySettingsInterface,
} from '../recovery.policy.js';

describe(RecoveryPolicy.name, () => {
  const defaultSettings: RecoveryPolicySettingsInterface = {
    otp: {
      category: 'auth-recovery',
      namespace: 'userOtp',
      type: 'uuid',
      expiresIn: '24h',
    },
  };

  it('should create with all OTP settings', () => {
    const policy = new RecoveryPolicy(defaultSettings);

    expect(policy.otpCategory).toBe('auth-recovery');
    expect(policy.otpNamespace).toBe('userOtp');
    expect(policy.otpType).toBe('uuid');
    expect(policy.otpExpiresIn).toBe('24h');
    expect(policy.otpDuplicateStrategy).toBeUndefined();
    expect(policy.otpRateSeconds).toBe(0);
    expect(policy.otpRateThreshold).toBe(0);
  });

  it('should use provided OTP optional values', () => {
    const policy = new RecoveryPolicy({
      otp: {
        ...defaultSettings.otp,
        duplicateStrategy: 'DEACTIVATE',
        rateSeconds: 60,
        rateThreshold: 5,
      },
    });

    expect(policy.otpDuplicateStrategy).toBe('DEACTIVATE');
    expect(policy.otpRateSeconds).toBe(60);
    expect(policy.otpRateThreshold).toBe(5);
  });
});
