import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserPasswordServiceInterface } from '@concepta/nestjs-user';

import {
  AUTH_RECOVERY_MODULE_SETTINGS_TOKEN,
  AuthRecoveryUserModelService,
  AuthRecoveryUserPasswordService,
} from '../auth-recovery.constants';
import { AuthRecoveryNotificationServiceInterface } from '../interfaces/auth-recovery-notification.service.interface';
import { AuthRecoveryOtpServiceInterface } from '../interfaces/auth-recovery-otp.service.interface';
import { AuthRecoverySettingsInterface } from '../interfaces/auth-recovery-settings.interface';
import { AuthRecoveryUserModelServiceInterface } from '../interfaces/auth-recovery-user-model.service.interface';

import { AuthRecoveryNotificationService } from './auth-recovery-notification.service';
import { AuthRecoveryService } from './auth-recovery.service';

import { AppModuleFixture } from '../__fixtures__/app.module.fixture';
import { OtpServiceFixture } from '../__fixtures__/otp/otp.service.fixture';
import { UserFixture } from '../__fixtures__/user/user.fixture';

describe(AuthRecoveryService, () => {
  let app: INestApplication;
  let authRecoveryService: AuthRecoveryService;
  let notificationService: AuthRecoveryNotificationServiceInterface;
  let otpService: AuthRecoveryOtpServiceInterface;
  let userModelService: AuthRecoveryUserModelServiceInterface;
  let userPasswordService: UserPasswordServiceInterface;
  let settings: AuthRecoverySettingsInterface;

  let spySendRecoverLoginEmail: jest.SpyInstance;
  let spySendRecoverPasswordEmail: jest.SpyInstance;
  let spySendRecoverPasswordSuccessEmail: jest.SpyInstance;
  let spyOtpServiceValidate: jest.SpyInstance;
  let spyUserModelServiceByEmail: jest.SpyInstance;
  let spyUserPasswordServiceSetPassword: jest.SpyInstance;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authRecoveryService =
      moduleFixture.get<AuthRecoveryService>(AuthRecoveryService);

    otpService =
      moduleFixture.get<AuthRecoveryOtpServiceInterface>(OtpServiceFixture);

    settings = moduleFixture.get<AuthRecoverySettingsInterface>(
      AUTH_RECOVERY_MODULE_SETTINGS_TOKEN,
    );

    notificationService =
      moduleFixture.get<AuthRecoveryNotificationServiceInterface>(
        AuthRecoveryNotificationService,
      );

    userModelService = moduleFixture.get<AuthRecoveryUserModelServiceInterface>(
      AuthRecoveryUserModelService,
    );

    userPasswordService = moduleFixture.get<UserPasswordServiceInterface>(
      AuthRecoveryUserPasswordService,
    );

    spySendRecoverLoginEmail = jest
      .spyOn(notificationService, 'sendRecoverLoginEmail')
      .mockResolvedValue(undefined);

    spySendRecoverPasswordEmail = jest
      .spyOn(notificationService, 'sendRecoverPasswordEmail')
      .mockResolvedValue(undefined);

    spySendRecoverPasswordSuccessEmail = jest
      .spyOn(notificationService, 'sendPasswordUpdatedSuccessfullyEmail')
      .mockResolvedValue(undefined);

    spyOtpServiceValidate = jest.spyOn(otpService, 'validate');
    spyUserModelServiceByEmail = jest.spyOn(userModelService, 'byEmail');
    spyUserPasswordServiceSetPassword = jest.spyOn(
      userPasswordService,
      'setPassword',
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  describe(AuthRecoveryService.prototype.recoverLogin, () => {
    it('should send login recovery', async () => {
      const result = await authRecoveryService.recoverLogin(UserFixture.email);

      expect(result).toBeUndefined();
      expect(spyUserModelServiceByEmail).toHaveBeenCalledTimes(1);
      expect(spyUserModelServiceByEmail).toHaveBeenCalledWith(
        UserFixture.email,
      );

      expect(spySendRecoverLoginEmail).toHaveBeenCalledTimes(1);
      expect(spySendRecoverLoginEmail).toHaveBeenCalledWith(
        UserFixture.email,
        UserFixture.username,
      );
    });
  });

  describe(AuthRecoveryService.prototype.recoverPassword, () => {
    it('should send password recovery', async () => {
      const result = await authRecoveryService.recoverPassword(
        UserFixture.email,
      );

      expect(result).toBeUndefined();
      expect(spyUserModelServiceByEmail).toHaveBeenCalledTimes(1);
      expect(spyUserModelServiceByEmail).toHaveBeenCalledWith(
        UserFixture.email,
      );

      expect(spySendRecoverPasswordEmail).toHaveBeenCalledTimes(1);
      expect(spySendRecoverPasswordEmail).toHaveBeenCalledWith(
        UserFixture.email,
        'GOOD_PASSCODE',
        expect.any(Date),
      );
    });
  });

  describe(AuthRecoveryService.prototype.validatePasscode, () => {
    it('should call otp validator', async () => {
      await authRecoveryService.validatePasscode('GOOD_PASSCODE');

      expect(spyOtpServiceValidate).toHaveBeenCalledWith(
        settings.otp.assignment,
        { category: settings.otp.category, passcode: 'GOOD_PASSCODE' },
        false,
      );
    });

    it('should validate good passcode', async () => {
      const otp = await authRecoveryService.validatePasscode('GOOD_PASSCODE');
      expect(otp).toEqual({ assigneeId: UserFixture.id });
    });

    it('should not validate bad passcode', async () => {
      const otp = await authRecoveryService.validatePasscode('BAD_PASSCODE');
      expect(otp).toBeNull();
    });
  });

  describe(AuthRecoveryService.prototype.updatePassword, () => {
    it('should call user password service', async () => {
      await authRecoveryService.updatePassword(
        'GOOD_PASSCODE',
        '$!Abc123bsksl6764579',
      );

      expect(spyUserPasswordServiceSetPassword).toHaveBeenCalledTimes(1);
      expect(spyUserPasswordServiceSetPassword).toHaveBeenCalledWith(
        { password: '$!Abc123bsksl6764579' },
        UserFixture.id,
      );
    });

    it('should send success email', async () => {
      await authRecoveryService.updatePassword(
        'GOOD_PASSCODE',
        'any_string_will_do',
      );

      expect(spySendRecoverPasswordSuccessEmail).toHaveBeenCalledTimes(1);
      expect(spySendRecoverPasswordSuccessEmail).toHaveBeenCalledWith(
        UserFixture.email,
      );
    });

    it('should update password', async () => {
      const user = await authRecoveryService.updatePassword(
        'GOOD_PASSCODE',
        '$!Abc123bsksl6764579',
      );

      expect(user).toEqual(UserFixture);
    });

    it('should fail to update password', async () => {
      const user = await authRecoveryService.updatePassword(
        'FAKE_PASSCODE',
        '$!Abc123bsksl6764579',
      );

      expect(user).toBeNull();
    });
  });
});
