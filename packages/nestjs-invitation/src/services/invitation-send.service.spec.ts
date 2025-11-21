import { randomUUID } from 'crypto';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  RepositoryInterface,
  INVITATION_MODULE_CATEGORY_USER_KEY,
  getDynamicRepositoryToken,
  UserEntityInterface,
} from '@concepta/nestjs-common';
import { EmailService } from '@concepta/nestjs-email';
import { UserFactory } from '@concepta/nestjs-user/src/seeding';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { InvitationSettingsInterface } from '../interfaces/options/invitation-settings.interface';
import { INVITATION_MODULE_SETTINGS_TOKEN } from '../invitation.constants';

import { InvitationSendService } from './invitation-send.service';

import { AppModuleFixture } from '../__fixtures__/app.module.fixture';
import { UserOtpEntityFixture } from '../__fixtures__/user/entities/user-otp.entity.fixture';
import { UserEntityFixture } from '../__fixtures__/user/entities/user.entity.fixture';

describe(InvitationSendService, () => {
  let spyEmailService: jest.SpyInstance;

  let app: INestApplication;
  let seedingSource: SeedingSource;
  let settings: InvitationSettingsInterface;
  let userOtpRepo: RepositoryInterface<UserOtpEntityFixture>;
  let invitationSendService: InvitationSendService;

  let testUser: UserEntityInterface;

  beforeEach(async () => {
    spyEmailService = jest
      .spyOn(EmailService.prototype, 'sendMail')
      .mockImplementation(async () => undefined);

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();
    app = testingModule.createNestApplication();
    await app.init();

    settings = testingModule.get<InvitationSettingsInterface>(
      INVITATION_MODULE_SETTINGS_TOKEN,
    );

    userOtpRepo = testingModule.get<RepositoryInterface<UserOtpEntityFixture>>(
      getDynamicRepositoryToken('user-otp'),
    );

    invitationSendService = testingModule.get<InvitationSendService>(
      InvitationSendService,
    );

    seedingSource = new SeedingSource({
      dataSource: testingModule.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    const userFactory = new UserFactory({
      entity: UserEntityFixture,
      seedingSource,
    });

    testUser = await userFactory.create();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  describe(InvitationSendService.prototype.send, () => {
    it('Should send invitation email', async () => {
      const inviteCode = randomUUID();

      await invitationSendService.send({
        id: 'abcdefg',
        userId: testUser.id,
        code: inviteCode,
        category: INVITATION_MODULE_CATEGORY_USER_KEY,
      });

      const otps = await userOtpRepo.find({
        where: { assigneeId: testUser.id },
      });

      expect(otps.length).toEqual(1);
      expect(otps[0].category).toEqual(INVITATION_MODULE_CATEGORY_USER_KEY);
      expect(spyEmailService).toHaveBeenCalledTimes(1);

      const { passcode, expirationDate } = otps[0];

      expect(spyEmailService).toHaveBeenCalledWith({
        to: testUser.email,
        from: settings.email.from,
        context: {
          logo: `${settings.email.baseUrl}/${settings.email.templates.invitation.logo}`,
          tokenUrl: `${settings.email.baseUrl}/?code=${inviteCode}&passcode=${passcode}`,
          tokenExp: expirationDate,
        },
        subject: settings.email.templates.invitation.subject,
        template: settings.email.templates.invitation.fileName,
      });
    });
  });
});
