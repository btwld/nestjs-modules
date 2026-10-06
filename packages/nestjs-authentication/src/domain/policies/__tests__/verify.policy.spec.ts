import {
  VerifyPolicy,
  type VerifyPolicySettingsInterface,
} from '../verify.policy.js';

describe(VerifyPolicy.name, () => {
  const defaultSettings: VerifyPolicySettingsInterface = {
    otp: {
      category: 'auth-verify',
      namespace: 'userOtp',
      type: 'uuid',
      expiresIn: '48h',
    },
  };

  it('should create with all OTP settings', () => {
    const policy = new VerifyPolicy(defaultSettings);

    expect(policy.otpCategory).toBe('auth-verify');
    expect(policy.otpNamespace).toBe('userOtp');
    expect(policy.otpType).toBe('uuid');
    expect(policy.otpExpiresIn).toBe('48h');
    expect(policy.otpDuplicateStrategy).toBeUndefined();
    expect(policy.otpRateSeconds).toBe(0);
    expect(policy.otpRateThreshold).toBe(0);
  });

  it('should use provided OTP optional values', () => {
    const policy = new VerifyPolicy({
      otp: {
        ...defaultSettings.otp,
        duplicateStrategy: 'DEACTIVATE',
        rateSeconds: 30,
        rateThreshold: 3,
      },
    });

    expect(policy.otpDuplicateStrategy).toBe('DEACTIVATE');
    expect(policy.otpRateSeconds).toBe(30);
    expect(policy.otpRateThreshold).toBe(3);
  });
});
