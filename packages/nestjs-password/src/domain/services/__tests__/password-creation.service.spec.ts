import { PasswordStrengthEnum } from '../../enum/password-strength.enum.js';
import { PasswordNotStrongException } from '../../exceptions/password-not-strong.exception.js';
import { PasswordUsedRecentlyException } from '../../exceptions/password-used-recently.exception.js';
import { type PasswordStorageInterface } from '../../password/interfaces/password-storage.interface.js';
import {
  PasswordPolicy,
  type PasswordPolicySettings,
} from '../../policies/password.policy.js';
import { PasswordCreationService } from '../password-creation.service.js';
import { PasswordStorageService } from '../password-storage.service.js';
import { PasswordStrengthService } from '../password-strength.service.js';
import { PasswordValidationService } from '../password-validation.service.js';

describe(PasswordCreationService, () => {
  let policySettings: PasswordPolicySettings;
  let policy: PasswordPolicy;
  let passwordCreationService: PasswordCreationService;
  let passwordStorageService: PasswordStorageService;
  let passwordValidationService: PasswordValidationService;
  let passwordStrengthService: PasswordStrengthService;

  const PASSWORD_WEAK = 'secret';
  const PASSWORD_MEDIUM = 'F*h#1d*fQ@XB';

  beforeEach(async () => {
    policySettings = {
      minPasswordStrength: PasswordStrengthEnum.Medium,
      requireCurrentToUpdate: false,
    };
    policy = new PasswordPolicy(policySettings);

    passwordStorageService = new PasswordStorageService();
    passwordValidationService = new PasswordValidationService();
    passwordStrengthService = new PasswordStrengthService(policy);

    passwordCreationService = new PasswordCreationService(
      policy,
      passwordStorageService,
      passwordValidationService,
      passwordStrengthService,
    );
  });

  it('should be defined', () => {
    expect(passwordCreationService).toBeDefined();
  });

  describe(PasswordCreationService.prototype.create, () => {
    it('should create a password on object WITHOUT current password requirement', async () => {
      // encrypt password
      const passwordStorageObject: PasswordStorageInterface =
        await passwordCreationService.create(PASSWORD_MEDIUM);

      expect(typeof passwordStorageObject.passwordHash).toEqual('string');
    });

    it('should NOT create a password on object WITH a WEAK password', async () => {
      const t = async () => {
        // try to create on object with a weak password
        await passwordCreationService.create(PASSWORD_WEAK);
      };

      await expect(t).rejects.toThrow(PasswordNotStrongException);
      await expect(t).rejects.toThrow('Password is not strong enough');
    });
  });

  describe(PasswordCreationService.prototype.validateCurrent, () => {
    it('should be validated', async () => {
      // encrypt "current" password
      const passwordStorageObjectCurrent: PasswordStorageInterface =
        await passwordStorageService.hashObject({
          password: 'current-password-string',
        });

      const isValid = await passwordCreationService.validateCurrent({
        password: 'current-password-string',
        target: passwordStorageObjectCurrent,
      });

      expect(isValid).toEqual<boolean>(true);
    });

    it('should NOT be validated', async () => {
      // encrypt "current" password
      const passwordStorageObjectCurrent: PasswordStorageInterface =
        await passwordStorageService.hashObject({
          password: 'current-password-string',
        });

      const isValid = await passwordCreationService.validateCurrent({
        password: 'bad-current-password-string',
        target: passwordStorageObjectCurrent,
      });

      expect(isValid).toEqual<boolean>(false);
    });

    it('should NOT throw an error due to required current password setting', async () => {
      const isValid = await passwordCreationService.validateCurrent({});
      expect(isValid).toEqual<boolean>(true);
    });

    it('should throw an error due to required current password setting', async () => {
      const strictPolicy = new PasswordPolicy({
        ...policySettings,
        requireCurrentToUpdate: true,
      });
      const strictService = new PasswordCreationService(
        strictPolicy,
        passwordStorageService,
        passwordValidationService,
        passwordStrengthService,
      );

      const t = async () => {
        await strictService.validateCurrent({});
      };

      await expect(t).rejects.toThrow(Error);
      await expect(t).rejects.toThrow('Current password is required');
    });
  });

  describe(PasswordCreationService.prototype.validateHistory, () => {
    it('should return true when no targets match', async () => {
      const stored = await passwordStorageService.hash('old-password');

      const isValid = await passwordCreationService.validateHistory({
        password: 'different-password',
        targets: [stored],
      });

      expect(isValid).toEqual(true);
    });

    it('should throw when password matches a target', async () => {
      const stored = await passwordStorageService.hash(PASSWORD_MEDIUM);

      await expect(
        passwordCreationService.validateHistory({
          password: PASSWORD_MEDIUM,
          targets: [stored],
        }),
      ).rejects.toThrow(PasswordUsedRecentlyException);
    });

    it('should return true when targets array is empty', async () => {
      const isValid = await passwordCreationService.validateHistory({
        password: PASSWORD_MEDIUM,
        targets: [],
      });

      expect(isValid).toEqual(true);
    });
  });
});
