import { PasswordStrengthEnum } from '../../enum/password-strength.enum.js';
import {
  PasswordPolicy,
  type PasswordPolicySettings,
} from '../../policies/password.policy.js';
import { PasswordStrengthService } from '../password-strength.service.js';

const PASSWORD_NONE = 'password';
const PASSWORD_WEAK = 'A12345678';
const PASSWORD_MEDIUM = 'AS12378';
const PASSWORD_STRONG = 'P@S645R78';
const PASSWORD_VERY_STRONG = 'P@5_0d645s9';

function createService(
  settings: PasswordPolicySettings = {},
): PasswordStrengthService {
  return new PasswordStrengthService(new PasswordPolicy(settings));
}

describe('PasswordStrengthService', () => {
  it('should be defined', () => {
    const service = createService({
      minPasswordStrength: PasswordStrengthEnum.Medium,
    });
    expect(service).toBeDefined();
  });

  it('should accept password when min strength is None', () => {
    const service = createService({
      minPasswordStrength: PasswordStrengthEnum.None,
    });
    expect(service.isStrong(PASSWORD_NONE)).toBe(true);
  });

  it('should accept password when min strength is Weak', () => {
    const service = createService({
      minPasswordStrength: PasswordStrengthEnum.Weak,
    });
    expect(service.isStrong(PASSWORD_WEAK)).toBe(true);
  });

  it('should accept password when min strength is Medium', () => {
    const service = createService({
      minPasswordStrength: PasswordStrengthEnum.Medium,
    });
    expect(service.isStrong(PASSWORD_MEDIUM)).toBe(true);
  });

  it('should accept password when min strength is Strong', () => {
    const service = createService({
      minPasswordStrength: PasswordStrengthEnum.Strong,
    });
    expect(service.isStrong(PASSWORD_STRONG)).toBe(true);
  });

  it('should accept very strong password when min strength is Strong', () => {
    const service = createService({
      minPasswordStrength: PasswordStrengthEnum.Strong,
    });
    expect(service.isStrong(PASSWORD_VERY_STRONG)).toBe(true);
  });

  it('should reject medium password when min strength is Strong', () => {
    const service = createService({
      minPasswordStrength: PasswordStrengthEnum.Strong,
    });
    expect(service.isStrong(PASSWORD_MEDIUM)).toBe(false);
  });

  it('should default to None when settings are empty', () => {
    const service = createService({});
    expect(service.isStrong(PASSWORD_NONE)).toBe(true);
  });
});
