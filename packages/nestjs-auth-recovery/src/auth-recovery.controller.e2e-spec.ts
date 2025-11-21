import supertest from 'supertest';

import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  OtpInterface,
  UserInterface,
  ExceptionsFilter,
} from '@concepta/nestjs-common';
import { EmailService } from '@concepta/nestjs-email';
import { OtpService } from '@concepta/nestjs-otp';
import { UserModelService } from '@concepta/nestjs-user';
import { UserFactory } from '@concepta/nestjs-user/src/seeding';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { AUTH_RECOVERY_MODULE_SETTINGS_TOKEN } from './auth-recovery.constants';
import { AuthRecoveryRecoverLoginDto } from './dto/auth-recovery-recover-login.dto';
import { AuthRecoveryRecoverPasswordDto } from './dto/auth-recovery-recover-password.dto';
import { AuthRecoveryUpdatePasswordDto } from './dto/auth-recovery-update-password.dto';
import { AuthRecoverySettingsInterface } from './interfaces/auth-recovery-settings.interface';

import { AppModuleDbFixture } from './__fixtures__/app.module.db.fixture';
import { AuthRecoveryController } from './__fixtures__/auth-recovery.controller.fixture';
import { UserEntityFixture } from './__fixtures__/user/entities/user-entity.fixture';

describe(AuthRecoveryController, () => {
  let app: INestApplication;
  let otpService: OtpService;
  let userModelService: UserModelService;
  let settings: AuthRecoverySettingsInterface;
  let user: UserEntityFixture;
  let seedingSource: SeedingSource;
  let userFactory: UserFactory;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleDbFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    const exceptionsFilter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new ExceptionsFilter(exceptionsFilter));

    await app.init();

    otpService = moduleFixture.get<OtpService>(OtpService);
    userModelService = moduleFixture.get<UserModelService>(UserModelService);

    settings = moduleFixture.get<AuthRecoverySettingsInterface>(
      AUTH_RECOVERY_MODULE_SETTINGS_TOKEN,
    );

    seedingSource = new SeedingSource({
      dataSource: moduleFixture.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    userFactory = new UserFactory({
      entity: UserEntityFixture,
      seedingSource,
    });

    user = await userFactory.create();

    jest.spyOn(EmailService.prototype, 'sendMail').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  it('POST auth/recover-login', async () => {
    await supertest(app.getHttpServer())
      .post('/auth/recovery/login')
      .send({ email: user.email } as AuthRecoveryRecoverLoginDto)
      .expect(201);
  });

  it('GET auth/recovery/passcode/{passcode}', async () => {
    const user = await getFirstUser(app);

    const otpCreateDto = await createOtp(settings, otpService, user.id);

    const { passcode } = otpCreateDto;

    await supertest(app.getHttpServer())
      .get(`/auth/recovery/passcode/${passcode}`)
      .expect(200);

    await validateRecoverPassword(app, user);
  });

  it('GET auth/recovery/passcode/{passcode} fail after create', async () => {
    const user = await getFirstUser(app);

    const otpCreateDto = await createOtp(settings, otpService, user.id);
    // this should clear old otp
    await createOtp(settings, otpService, user.id, true);

    const { passcode } = otpCreateDto;

    // should fail
    await supertest(app.getHttpServer())
      .get(`/auth/recovery/passcode/${passcode}`)
      .expect(400);
  });

  it('POST auth/recovery/password', async () => {
    const user = await getFirstUser(app);

    await validateRecoverPassword(app, user);
  });

  it('PATCH auth/recovery/password', async () => {
    const user = await getFirstUser(app);

    await validateRecoverPassword(app, user);

    const otpCreateDto = await createOtp(settings, otpService, user.id);

    await supertest(app.getHttpServer())
      .patch('/auth/recovery/password')
      .send({
        passcode: otpCreateDto.passcode,
        newPassword: '$!Abc123bsksl6764579',
      } as AuthRecoveryUpdatePasswordDto)
      .expect(200);
  });

  const getFirstUser = async (
    _app: INestApplication,
  ): Promise<UserInterface> => {
    const response = await userModelService.find();
    return response[0];
  };
});

const validateRecoverPassword = async (
  app: INestApplication,
  user: UserInterface,
): Promise<void> => {
  await supertest(app.getHttpServer())
    .post('/auth/recovery/password')
    .send({ email: user.email } as AuthRecoveryRecoverPasswordDto)
    .expect(201);
};

const createOtp = async (
  config: AuthRecoverySettingsInterface,
  otpService: OtpService,
  userId: string,
  clearOnCreate?: boolean,
): Promise<OtpInterface> => {
  const { category, assignment, type, expiresIn } = config.otp;

  return await otpService.create({
    assignment,
    otp: {
      category,
      type,
      expiresIn,
      assigneeId: userId,
    },
    clearOnCreate,
  });
};
