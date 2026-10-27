import { type PasswordStorageInterface } from '../../password/interfaces/password-storage.interface.js';
import { PasswordStorageService } from '../password-storage.service.js';
import { PasswordValidationService } from '../password-validation.service.js';

describe('PasswordValidationService', () => {
  let storageService: PasswordStorageService;
  let validationService: PasswordValidationService;

  const PASSWORD_MEDIUM = 'AS12378';

  beforeEach(async () => {
    storageService = new PasswordStorageService();
    validationService = new PasswordValidationService();
  });

  it('should be defined', () => {
    expect(validationService).toBeDefined();
  });

  describe(PasswordValidationService.prototype.validate, () => {
    it('should successfully validate a correct password', async () => {
      const stored: PasswordStorageInterface =
        await storageService.hash(PASSWORD_MEDIUM);

      const isValid = await validationService.validate({
        password: PASSWORD_MEDIUM,
        passwordHash: stored.passwordHash,
      });

      expect(isValid).toEqual(true);
    });

    it('should NOT validate an incorrect password', async () => {
      const stored: PasswordStorageInterface =
        await storageService.hash(PASSWORD_MEDIUM);

      const isValid = await validationService.validate({
        password: 'wrong-password',
        passwordHash: stored.passwordHash,
      });

      expect(isValid).toEqual(false);
    });

    it('should NOT validate against an invalid hash', async () => {
      const isValid = await validationService.validate({
        password: PASSWORD_MEDIUM,
        passwordHash: 'not-a-valid-bcrypt-hash',
      });

      expect(isValid).toEqual(false);
    });
  });
});
