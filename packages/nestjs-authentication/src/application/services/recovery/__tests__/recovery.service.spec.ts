import { mock } from 'vitest-mock-extended';

import { RecoveryPolicy } from '../../../../domain/policies/recovery.policy.js';
import { type OtpPort } from '../../../../domain/ports/otp.port.js';
import { type PasswordPort } from '../../../../domain/ports/password.port.js';
import { type RecoveryNotificationPort } from '../../../../domain/ports/recovery-notification.port.js';
import { type UserPort } from '../../../../domain/ports/user.port.js';
import { RecoveryService } from '../recovery.service.js';

describe(RecoveryService, () => {
  const UserFixture = {
    id: 'abc',
    email: 'me@dispostable.com',
    username: 'me@dispostable.com',
    active: true,
  };

  let recoveryService: RecoveryService;
  let otpPort: OtpPort;
  let userPort: UserPort;
  let passwordPort: PasswordPort;
  let recoveryNotificationPort: RecoveryNotificationPort;
  let policy: RecoveryPolicy;

  beforeEach(async () => {
    policy = new RecoveryPolicy({
      otp: {
        category: 'auth-recovery',
        namespace: 'userOtp',
        type: 'uuid',
        expiresIn: '1h',
        duplicateStrategy: 'DEACTIVATE',
        rateSeconds: 60,
        rateThreshold: 5,
      },
    });

    otpPort = mock<OtpPort>();
    userPort = mock<UserPort>();
    passwordPort = mock<PasswordPort>();
    recoveryNotificationPort = mock<RecoveryNotificationPort>();

    recoveryService = new RecoveryService(
      policy,
      otpPort,
      userPort,
      passwordPort,
      recoveryNotificationPort,
    );
  });

  describe(RecoveryService.prototype.recoverLogin, () => {
    it('should send login recovery', async () => {
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);

      const result = await recoveryService.recoverLogin({}, UserFixture.email);

      expect(result).toBeUndefined();
      expect(userPort.getByEmail).toHaveBeenCalledTimes(1);
      expect(userPort.getByEmail).toHaveBeenCalledWith({}, UserFixture.email);

      expect(recoveryNotificationPort.sendRecoverLogin).toHaveBeenCalledTimes(
        1,
      );
      expect(recoveryNotificationPort.sendRecoverLogin).toHaveBeenCalledWith(
        {},
        UserFixture.email,
        UserFixture.username,
      );
    });
  });

  describe(RecoveryService.prototype.recoverPassword, () => {
    it('should send password recovery', async () => {
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);
      void otpPort.create;
      vi.spyOn(otpPort, 'create').mockResolvedValue({
        category: 'auth-recovery',
        type: 'uuid',
        passcode: 'GOOD_PASSCODE',
        expirationDate: new Date(),
        active: true,
        assigneeId: UserFixture.id,
      });

      const result = await recoveryService.recoverPassword(
        {},
        UserFixture.email,
      );

      expect(result).toBeUndefined();
      expect(userPort.getByEmail).toHaveBeenCalledTimes(1);
      expect(userPort.getByEmail).toHaveBeenCalledWith({}, UserFixture.email);

      expect(
        recoveryNotificationPort.sendRecoverPassword,
      ).toHaveBeenCalledTimes(1);
      expect(recoveryNotificationPort.sendRecoverPassword).toHaveBeenCalledWith(
        {},
        UserFixture.email,
        {
          passcode: 'GOOD_PASSCODE',
          tokenExp: expect.any(Date),
        },
      );
    });
  });

  describe(RecoveryService.prototype.validatePasscode, () => {
    it('should call otp validator', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });

      await recoveryService.validatePasscode({}, 'GOOD_PASSCODE');

      expect(otpPort.validate).toHaveBeenCalledWith({}, policy.otpNamespace, {
        category: policy.otpCategory,
        passcode: 'GOOD_PASSCODE',
      });
    });

    it('should validate good passcode', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });

      const otp = await recoveryService.validatePasscode({}, 'GOOD_PASSCODE');
      expect(otp).toEqual({ assigneeId: UserFixture.id });
    });

    it('should not validate bad passcode', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue(null);

      const otp = await recoveryService.validatePasscode({}, 'BAD_PASSCODE');
      expect(otp).toBeNull();
    });
  });

  describe(RecoveryService.prototype.updatePassword, () => {
    it('should call password port setPassword', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });
      void userPort.getById;
      vi.spyOn(userPort, 'getById').mockResolvedValue(UserFixture);
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);

      await recoveryService.updatePassword(
        {},
        'GOOD_PASSCODE',
        '$!Abc123bsksl6764579',
      );

      expect(passwordPort.setPassword).toHaveBeenCalledTimes(1);
      expect(passwordPort.setPassword).toHaveBeenCalledWith(
        {},
        '$!Abc123bsksl6764579',
        UserFixture.id,
      );
    });

    it('should send success email', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });
      void userPort.getById;
      vi.spyOn(userPort, 'getById').mockResolvedValue(UserFixture);
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);

      await recoveryService.updatePassword(
        {},
        'GOOD_PASSCODE',
        'any_string_will_do',
      );

      expect(
        recoveryNotificationPort.sendPasswordUpdated,
      ).toHaveBeenCalledTimes(1);
      expect(recoveryNotificationPort.sendPasswordUpdated).toHaveBeenCalledWith(
        {},
        UserFixture.email,
      );
    });

    it('should update password', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });
      void userPort.getById;
      vi.spyOn(userPort, 'getById').mockResolvedValue(UserFixture);
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);

      const user = await recoveryService.updatePassword(
        {},
        'GOOD_PASSCODE',
        '$!Abc123bsksl6764579',
      );

      expect(user).toEqual(UserFixture);
    });

    it('should fail to update password', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue(null);

      const user = await recoveryService.updatePassword(
        {},
        'FAKE_PASSCODE',
        '$!Abc123bsksl6764579',
      );

      expect(user).toBeNull();
    });
  });
});
