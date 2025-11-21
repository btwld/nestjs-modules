import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  AUTH_VERIFY_MODULE_SETTINGS_TOKEN,
  AuthVerifyUserModelService,
} from '../auth-verify.constants';
import { AuthRecoveryOtpInvalidException } from '../exceptions/auth-verify-otp-invalid.exception';
import { AuthVerifyNotificationServiceInterface } from '../interfaces/auth-verify-notification.service.interface';
import { AuthVerifyOtpServiceInterface } from '../interfaces/auth-verify-otp.service.interface';
import { AuthVerifySettingsInterface } from '../interfaces/auth-verify-settings.interface';
import { AuthVerifyUserModelServiceInterface } from '../interfaces/auth-verify-user-model.service.interface';

import { AuthVerifyNotificationService } from './auth-verify-notification.service';
import { AuthVerifyService } from './auth-verify.service';

import { AppModuleFixture } from '../__fixtures__/app.module.fixture';
import { OtpServiceFixture } from '../__fixtures__/otp/otp.service.fixture';
import { UserFixture } from '../__fixtures__/user/user.fixture';

describe(AuthVerifyService, () => {
  let app: INestApplication;
  let authVerifyService: AuthVerifyService;
  let notificationService: AuthVerifyNotificationServiceInterface;
  let otpService: AuthVerifyOtpServiceInterface;
  let userModelService: AuthVerifyUserModelServiceInterface;
  let settings: AuthVerifySettingsInterface;

  let sendVerifyEmail: jest.SpyInstance;
  let spyOtpServiceValidate: jest.SpyInstance;
  let spyUserModelServiceByEmail: jest.SpyInstance;
  let spyUserModelServiceUpdate: jest.SpyInstance;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authVerifyService = moduleFixture.get<AuthVerifyService>(AuthVerifyService);

    otpService =
      moduleFixture.get<AuthVerifyOtpServiceInterface>(OtpServiceFixture);

    settings = moduleFixture.get<AuthVerifySettingsInterface>(
      AUTH_VERIFY_MODULE_SETTINGS_TOKEN,
    );

    notificationService =
      moduleFixture.get<AuthVerifyNotificationServiceInterface>(
        AuthVerifyNotificationService,
      );

    userModelService = moduleFixture.get<AuthVerifyUserModelServiceInterface>(
      AuthVerifyUserModelService,
    );

    sendVerifyEmail = jest
      .spyOn(notificationService, 'sendVerifyEmail')
      .mockResolvedValue(undefined);

    spyOtpServiceValidate = jest.spyOn(otpService, 'validate');
    spyUserModelServiceByEmail = jest.spyOn(userModelService, 'byEmail');
    spyUserModelServiceUpdate = jest.spyOn(userModelService, 'update');
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  describe(AuthVerifyService.prototype.send, () => {
    it('should send passcode verify', async () => {
      const result = await authVerifyService.send({ email: UserFixture.email });

      expect(result).toBeUndefined();
      expect(spyUserModelServiceByEmail).toHaveBeenCalledTimes(1);
      expect(spyUserModelServiceByEmail).toHaveBeenCalledWith(
        UserFixture.email,
      );

      expect(sendVerifyEmail).toHaveBeenCalledTimes(1);
      expect(sendVerifyEmail).toHaveBeenCalledWith({
        email: UserFixture.email,
        passcode: 'GOOD_PASSCODE',
        resetTokenExp: expect.any(Date),
      });
    });
  });

  describe(AuthVerifyService.prototype.validatePasscode, () => {
    it('should call otp validator', async () => {
      await authVerifyService.validatePasscode({ passcode: 'GOOD_PASSCODE' });

      expect(spyOtpServiceValidate).toHaveBeenCalledWith(
        settings.otp.assignment,
        { category: settings.otp.category, passcode: 'GOOD_PASSCODE' },
        false,
      );
    });

    it('should validate good passcode', async () => {
      const otp = await authVerifyService.validatePasscode({
        passcode: 'GOOD_PASSCODE',
      });
      expect(otp).toEqual({ assigneeId: UserFixture.id });
    });

    it('should not validate bad passcode', async () => {
      const otp = await authVerifyService.validatePasscode({
        passcode: 'BAD_PASSCODE',
      });
      expect(otp).toBeNull();
    });
  });

  describe(AuthVerifyService.prototype.confirmUser, () => {
    it('should call user model service', async () => {
      await authVerifyService.confirmUser({ passcode: 'GOOD_PASSCODE' });

      expect(spyUserModelServiceUpdate).toHaveBeenCalledTimes(1);
      expect(spyUserModelServiceUpdate).toHaveBeenCalledWith({
        id: UserFixture.id,
        active: true,
      });
    });

    it('should confirm user', async () => {
      const user = await authVerifyService.confirmUser({
        passcode: 'GOOD_PASSCODE',
      });

      expect(user).toEqual(UserFixture);
    });

    it('should fail to confirm user', async () => {
      const t = async () => {
        await authVerifyService.confirmUser({
          passcode: 'FAKE_PASSCODE',
        });
      };

      expect(t).rejects.toThrow(AuthRecoveryOtpInvalidException);
    });
  });
});
