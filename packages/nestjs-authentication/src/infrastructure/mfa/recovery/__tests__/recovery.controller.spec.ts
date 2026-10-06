import { mock } from 'vitest-mock-extended';

import { type RecoveryRecoverLoginParamsInterface } from '../../../../application/services/recovery/interfaces/recovery-recover-login-params.interface.js';
import { type RecoveryUpdatePasswordParamsInterface } from '../../../../application/services/recovery/interfaces/recovery-update-password-params.interface.js';
import { type RecoveryService } from '../../../../application/services/recovery/recovery.service.js';
import { RecoveryOtpInvalidException } from '../exceptions/recovery-otp-invalid.exception.js';

import { RecoveryController } from './fixtures/recovery.controller.fixture.js';

describe(RecoveryController.name, () => {
  let controller: RecoveryController;
  let recoveryService: RecoveryService;
  const dto: RecoveryRecoverLoginParamsInterface = {
    email: 'test@example.com',
  };
  const passwordDto: RecoveryUpdatePasswordParamsInterface = {
    passcode: '123456',
    newPassword: 'newPassword',
  };
  beforeEach(() => {
    recoveryService = mock<RecoveryService>();
    controller = new RecoveryController(recoveryService);
  });

  describe('recoverLogin', () => {
    it('should call recoverLogin method of RecoveryService', async () => {
      void recoveryService.recoverLogin;
      const recoverLoginSpy = vi.spyOn(recoveryService, 'recoverLogin');

      await controller.recoverLogin({}, dto);

      expect(recoverLoginSpy).toHaveBeenCalledWith({}, dto.email);
    });
  });

  describe('recoverPassword', () => {
    it('should call recoverPassword method of RecoveryService', async () => {
      void recoveryService.recoverPassword;
      const recoverPasswordSpy = vi.spyOn(recoveryService, 'recoverPassword');

      await controller.recoverPassword({}, dto);

      expect(recoverPasswordSpy).toHaveBeenCalledWith({}, dto.email);
    });
  });

  describe('validatePasscode', () => {
    it('should call validatePasscode method of RecoveryService', async () => {
      void recoveryService.validatePasscode;
      const validatePasscodeSpy = vi
        .spyOn(recoveryService, 'validatePasscode')
        .mockResolvedValue(null);

      const t = () => controller.validatePasscode({}, passwordDto.passcode);
      await expect(t).rejects.toThrow(RecoveryOtpInvalidException);

      expect(validatePasscodeSpy).toHaveBeenCalledWith(
        {},
        passwordDto.passcode,
      );
    });

    it('should call validatePasscode method of RecoveryService', async () => {
      void recoveryService.validatePasscode;
      const validatePasscodeSpy = vi
        .spyOn(recoveryService, 'validatePasscode')
        .mockResolvedValue({
          assigneeId: '1',
        });

      await controller.validatePasscode({}, passwordDto.passcode);

      expect(validatePasscodeSpy).toHaveBeenCalledWith(
        {},
        passwordDto.passcode,
      );
    });
  });

  describe('updatePassword', () => {
    it('should call updatePassword method of RecoveryService', async () => {
      void recoveryService.updatePassword;
      const updatePasswordSpy = vi
        .spyOn(recoveryService, 'updatePassword')
        .mockResolvedValue(null);

      const t = () => controller.updatePassword({}, passwordDto);
      await expect(t).rejects.toThrow(RecoveryOtpInvalidException);

      expect(updatePasswordSpy).toHaveBeenCalledWith(
        {},
        passwordDto.passcode,
        passwordDto.newPassword,
      );
    });

    it('should call updatePassword method of RecoveryService', async () => {
      void recoveryService.updatePassword;
      const updatePasswordSpy = vi
        .spyOn(recoveryService, 'updatePassword')
        .mockResolvedValue({
          id: '1',
        });

      await controller.updatePassword({}, passwordDto);

      expect(updatePasswordSpy).toHaveBeenCalledWith(
        {},
        passwordDto.passcode,
        passwordDto.newPassword,
      );
    });
  });
});
