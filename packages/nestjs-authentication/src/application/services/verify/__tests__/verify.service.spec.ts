import { mock } from 'vitest-mock-extended';

import { VerifyPolicy } from '../../../../domain/policies/verify.policy.js';
import { type OtpPort } from '../../../../domain/ports/otp.port.js';
import { type UserPort } from '../../../../domain/ports/user.port.js';
import { type VerifyNotificationPort } from '../../../../domain/ports/verify-notification.port.js';
import { VerifyOtpInvalidException } from '../../../exceptions/verify-otp-invalid.exception.js';
import { VerifyService } from '../verify.service.js';

describe(VerifyService, () => {
  const UserFixture = {
    id: 'abc',
    email: 'me@dispostable.com',
    username: 'me@dispostable.com',
    active: true,
  };

  let verifyService: VerifyService;
  let otpPort: OtpPort;
  let userPort: UserPort;
  let verifyNotificationPort: VerifyNotificationPort;
  let policy: VerifyPolicy;

  beforeEach(async () => {
    policy = new VerifyPolicy({
      otp: {
        category: 'auth-verify',
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
    verifyNotificationPort = mock<VerifyNotificationPort>();

    verifyService = new VerifyService(
      policy,
      otpPort,
      userPort,
      verifyNotificationPort,
    );
  });

  describe(VerifyService.prototype.send, () => {
    it('should send passcode verify', async () => {
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);
      void otpPort.create;
      vi.spyOn(otpPort, 'create').mockResolvedValue({
        category: 'auth-verify',
        type: 'uuid',
        passcode: 'GOOD_PASSCODE',
        expirationDate: new Date(),
        active: true,
        assigneeId: UserFixture.id,
      });

      const result = await verifyService.send({}, { email: UserFixture.email });

      expect(result).toBeUndefined();
      expect(userPort.getByEmail).toHaveBeenCalledTimes(1);
      expect(userPort.getByEmail).toHaveBeenCalledWith({}, UserFixture.email);

      expect(verifyNotificationPort.sendVerify).toHaveBeenCalledTimes(1);
      expect(verifyNotificationPort.sendVerify).toHaveBeenCalledWith(
        {},
        UserFixture.email,
        { passcode: 'GOOD_PASSCODE', tokenExp: expect.any(Date) },
      );
    });
  });

  describe(VerifyService.prototype.validatePasscode, () => {
    it('should call otp validator', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });

      await verifyService.validatePasscode({}, { passcode: 'GOOD_PASSCODE' });

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

      const otp = await verifyService.validatePasscode(
        {},
        { passcode: 'GOOD_PASSCODE' },
      );
      expect(otp).toEqual({ assigneeId: UserFixture.id });
    });

    it('should not validate bad passcode', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue(null);

      const otp = await verifyService.validatePasscode(
        {},
        { passcode: 'BAD_PASSCODE' },
      );
      expect(otp).toBeNull();
    });
  });

  describe(VerifyService.prototype.confirmUser, () => {
    it('should call user port update', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });
      void userPort.update;
      vi.spyOn(userPort, 'update').mockResolvedValue(UserFixture);
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);

      await verifyService.confirmUser({}, { passcode: 'GOOD_PASSCODE' });

      expect(userPort.update).toHaveBeenCalledTimes(1);
      expect(userPort.update).toHaveBeenCalledWith({}, UserFixture.id, {
        active: true,
      });
    });

    it('should confirm user', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue({
        assigneeId: UserFixture.id,
      });
      void userPort.update;
      vi.spyOn(userPort, 'update').mockResolvedValue(UserFixture);
      void userPort.getByEmail;
      vi.spyOn(userPort, 'getByEmail').mockResolvedValue(UserFixture);

      const user = await verifyService.confirmUser(
        {},
        { passcode: 'GOOD_PASSCODE' },
      );

      expect(user).toEqual(UserFixture);
    });

    it('should fail to confirm user', async () => {
      void otpPort.validate;
      vi.spyOn(otpPort, 'validate').mockResolvedValue(null);

      const t = async () => {
        await verifyService.confirmUser({}, { passcode: 'FAKE_PASSCODE' });
      };

      await expect(t).rejects.toThrow(VerifyOtpInvalidException);
    });
  });
});
