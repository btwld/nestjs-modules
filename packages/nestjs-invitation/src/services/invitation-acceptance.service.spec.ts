import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  INVITATION_MODULE_CATEGORY_USER_KEY,
  OtpInterface,
  UserInterface,
  UserEntityInterface,
  InvitationEntityInterface,
} from '@concepta/nestjs-common';
import { EmailService } from '@concepta/nestjs-email';
import { OtpService } from '@concepta/nestjs-otp';
import { UserFactory } from '@concepta/nestjs-user/src/seeding';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { InvitationAcceptedEventAsync } from '../events/invitation-accepted.event';
import { InvitationSettingsInterface } from '../interfaces/options/invitation-settings.interface';
import { INVITATION_MODULE_SETTINGS_TOKEN } from '../invitation.constants';
import { InvitationFactory } from '../seeding/invitation.factory';

import { InvitationAcceptanceService } from './invitation-acceptance.service';

import { AppModuleFixture } from '../__fixtures__/app.module.fixture';
import { InvitationEntityFixture } from '../__fixtures__/invitation/entities/invitation.entity.fixture';
import { UserEntityFixture } from '../__fixtures__/user/entities/user.entity.fixture';

describe(InvitationAcceptanceService, () => {
  const category = INVITATION_MODULE_CATEGORY_USER_KEY;

  let spyEmailService: jest.SpyInstance;
  let spyAcceptEventEmit: jest.SpyInstance;

  let app: INestApplication;
  let seedingSource: SeedingSource;
  let otpService: OtpService;
  let invitationAcceptanceService: InvitationAcceptanceService;
  let settings: InvitationSettingsInterface;

  let testUser: UserEntityInterface;
  let testInvitation: InvitationEntityInterface;

  beforeEach(async () => {
    spyEmailService = jest
      .spyOn(EmailService.prototype, 'sendMail')
      .mockImplementation(async () => undefined);

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();
    app = testingModule.createNestApplication();
    await app.init();

    invitationAcceptanceService =
      testingModule.get<InvitationAcceptanceService>(
        InvitationAcceptanceService,
      );

    otpService = testingModule.get<OtpService>(OtpService);

    settings = testingModule.get<InvitationSettingsInterface>(
      INVITATION_MODULE_SETTINGS_TOKEN,
    );

    spyAcceptEventEmit = jest.spyOn(
      InvitationAcceptedEventAsync.prototype,
      'emit',
    );

    seedingSource = new SeedingSource({
      dataSource: testingModule.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    const userFactory = new UserFactory({
      entity: UserEntityFixture,
      seedingSource,
    });

    const invitationFactory = new InvitationFactory({
      entity: InvitationEntityFixture,
      seedingSource,
    });

    testUser = await userFactory.create();
    testInvitation = await invitationFactory.create({
      userId: testUser.id,
      category,
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('Validate passcode', async () => {
    const otp = await createOtp(settings, otpService, testUser, category);

    const validOtp = await invitationAcceptanceService.validatePasscode(
      otp.passcode,
      category,
    );
    expect(validOtp?.assigneeId).toEqual(testUser.id);
  });

  it('Validate passcode (invalid)', async () => {
    const invalidOtp = await invitationAcceptanceService.validatePasscode(
      'FAKE_PASSCODE',
      category,
    );

    expect(invalidOtp).toBeNull();
  });

  it('Accept invite and update password', async () => {
    const otp = await createOtp(settings, otpService, testUser, category);

    const inviteAccepted = await invitationAcceptanceService.accept({
      code: testInvitation.code,
      passcode: otp.passcode,
      payload: {
        newPassword: 'hOdv2A2h%',
      },
    });

    expect(spyEmailService).toHaveBeenCalledTimes(1);
    expect(spyAcceptEventEmit).toHaveBeenCalledTimes(1);
    expect(inviteAccepted).toEqual(true);
  });

  it('Accept invite and update password (fail)', async () => {
    const inviteAccepted = await invitationAcceptanceService.accept({
      code: testInvitation.code,
      passcode: 'FAKE_PASSCODE',
    });

    expect(spyEmailService).toHaveBeenCalledTimes(0);
    expect(spyAcceptEventEmit).toHaveBeenCalledTimes(0);
    expect(inviteAccepted).toEqual(false);
  });
});

const createOtp = async (
  settings: InvitationSettingsInterface,
  otpService: OtpService,
  user: UserInterface,
  category: string,
  clearOnCreate?: boolean,
): Promise<OtpInterface> => {
  const { assignment, type, expiresIn } = settings.otp;

  const otp = await otpService.create({
    assignment,
    otp: {
      category,
      type,
      expiresIn,
      assigneeId: user.id,
    },
    clearOnCreate,
  });

  expect(otp).toBeTruthy();
  expect(otp.passcode).toBeTruthy();
  expect(otp.expirationDate).toBeTruthy();
  expect(otp.category).toEqual(category);
  expect(otp.type).toEqual(type);
  expect(otp.assigneeId).toEqual(user.id);

  return otp;
};
