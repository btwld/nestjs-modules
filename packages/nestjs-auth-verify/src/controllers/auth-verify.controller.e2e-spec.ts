import supertest from 'supertest';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { OtpInterface, UserInterface } from '@concepta/nestjs-common';
import { EmailService } from '@concepta/nestjs-email';
import { OtpService } from '@concepta/nestjs-otp';
import { UserModelService } from '@concepta/nestjs-user';
import { UserFactory } from '@concepta/nestjs-user/src/seeding';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { AUTH_VERIFY_MODULE_SETTINGS_TOKEN } from '../auth-verify.constants';
import { AuthVerifyUpdateDto } from '../dto/auth-verify-update.dto';
import { AuthVerifyDto } from '../dto/auth-verify.dto';
import { AuthVerifySettingsInterface } from '../interfaces/auth-verify-settings.interface';

import { AppModuleDbFixture } from '../__fixtures__/app.module.db.fixture';
import { AuthVerifyControllerFixture } from '../__fixtures__/auth-verify.controller.fixture';
import { UserEntityFixture } from '../__fixtures__/user/entities/user-entity.fixture';

describe(AuthVerifyControllerFixture, () => {
  let app: INestApplication;
  let otpService: OtpService;
  let userModelService: UserModelService;
  let settings: AuthVerifySettingsInterface;
  let seedingSource: SeedingSource;
  let userFactory: UserFactory;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleDbFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    otpService = moduleFixture.get<OtpService>(OtpService);
    userModelService = moduleFixture.get<UserModelService>(UserModelService);

    settings = moduleFixture.get<AuthVerifySettingsInterface>(
      AUTH_VERIFY_MODULE_SETTINGS_TOKEN,
    );

    seedingSource = new SeedingSource({
      dataSource: moduleFixture.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    userFactory = new UserFactory({
      entity: UserEntityFixture,
      seedingSource,
    });

    await userFactory.create({
      active: false,
    });

    jest.spyOn(EmailService.prototype, 'sendMail').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  it('POST auth/verify/send', async () => {
    const user = await getFirstUser(app);

    await send(app, user);
  });

  it('PATCH auth/verify/confirm', async () => {
    const user = await getFirstUser(app);

    await send(app, user);

    const otpCreateDto = await createOtp(settings, otpService, user.id);

    await supertest(app.getHttpServer())
      .patch('/auth/verify/confirm')
      .send({
        passcode: otpCreateDto.passcode,
      } as AuthVerifyUpdateDto)
      .expect(200);
  });

  const getFirstUser = async (
    _app: INestApplication,
  ): Promise<UserInterface> => {
    const response = await userModelService.find();
    return response[0];
  };
});

const send = async (
  app: INestApplication,
  user: UserInterface,
): Promise<void> => {
  await supertest(app.getHttpServer())
    .post('/auth/verify/send')
    .send({ email: user.email } as AuthVerifyDto)
    .expect(201);
};

const createOtp = async (
  config: AuthVerifySettingsInterface,
  otpService: OtpService,
  userId: string,
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
  });
};
