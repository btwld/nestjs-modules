import { PasswordRequiredException } from '../../exceptions/password-required.exception.js';
import { type PasswordStorageInterface } from '../../password/interfaces/password-storage.interface.js';
import { PasswordStorageService } from '../password-storage.service.js';
import { PasswordValidationService } from '../password-validation.service.js';

describe(PasswordStorageService, () => {
  let storageService: PasswordStorageService;
  let validationService: PasswordValidationService;

  const PASSWORD_MEDIUM = 'AS12378';

  beforeEach(async () => {
    storageService = new PasswordStorageService();
    validationService = new PasswordValidationService();
  });

  it('should be defined', () => {
    expect(storageService).toBeDefined();
  });

  describe(PasswordStorageService.prototype.hash, () => {
    it('should generate a password hash', async () => {
      const result: PasswordStorageInterface =
        await storageService.hash(PASSWORD_MEDIUM);

      expect(typeof result.passwordHash).toEqual('string');
      expect(result.passwordHash.length).toBeGreaterThan(0);

      const isValid = await validationService.validate({
        password: PASSWORD_MEDIUM,
        passwordHash: result.passwordHash,
      });

      expect(isValid).toEqual(true);
    });

    it('should generate different hashes for same password', async () => {
      const result1 = await storageService.hash(PASSWORD_MEDIUM);
      const result2 = await storageService.hash(PASSWORD_MEDIUM);

      expect(result1.passwordHash).not.toEqual(result2.passwordHash);
    });
  });

  describe(PasswordStorageService.prototype.hashObject, () => {
    it('should generate a password hash on object', async () => {
      const result: PasswordStorageInterface = await storageService.hashObject(
        { password: PASSWORD_MEDIUM },
        { required: true },
      );

      expect(typeof result.passwordHash).toEqual('string');

      const isValid = await validationService.validate({
        password: PASSWORD_MEDIUM,
        ...result,
      });

      expect(isValid).toEqual(true);
    });

    it('should generate a password hash on object with default options', async () => {
      const result: PasswordStorageInterface = await storageService.hashObject({
        password: PASSWORD_MEDIUM,
      });

      expect(typeof result.passwordHash).toEqual('string');

      const isValid = await validationService.validate({
        password: PASSWORD_MEDIUM,
        ...result,
      });

      expect(isValid).toEqual(true);
    });

    it('should NOT generate a password on object (not provided)', async () => {
      const result = await storageService.hashObject({}, { required: false });

      expect('passwordHash' in result).toEqual(false);
    });

    it('should FAIL to generate a password on object (not provided, but required)', async () => {
      const t = async () => {
        await storageService.hashObject({}, { required: true });
      };

      await expect(t).rejects.toThrow(PasswordRequiredException);
    });
  });
});
