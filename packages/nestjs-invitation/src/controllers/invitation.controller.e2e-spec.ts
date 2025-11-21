import { plainToInstance } from 'class-transformer';
import supertest from 'supertest';

import { INestApplication } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  INVITATION_MODULE_CATEGORY_ORG_KEY,
  INVITATION_MODULE_CATEGORY_USER_KEY,
  OtpInterface,
  UserInterface,
  InvitationEntityInterface,
} from '@concepta/nestjs-common';
import { EmailService } from '@concepta/nestjs-email';
import { OtpService } from '@concepta/nestjs-otp';
import { UserFactory } from '@concepta/nestjs-user/src/seeding';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { invitationDefaultConfig } from '../config/invitation-default.config';
import { InvitationAcceptInviteDto } from '../dto/invitation-accept-invite.dto';
import { InvitationCreateInviteDto } from '../dto/invitation-create-invite.dto';
import { InvitationDto } from '../dto/invitation.dto';
import { InvitationSettingsInterface } from '../interfaces/options/invitation-settings.interface';
import { INVITATION_MODULE_DEFAULT_SETTINGS_TOKEN } from '../invitation.constants';
import { InvitationFactory } from '../seeding/invitation.factory';

import { AppCrudModuleFixture } from '../__fixtures__/app-crud.module.fixture';
import { InvitationEntityFixture } from '../__fixtures__/invitation/entities/invitation.entity.fixture';
import { UserEntityFixture } from '../__fixtures__/user/entities/user.entity.fixture';

describe('InvitationController (e2e)', () => {
  const userCategory = INVITATION_MODULE_CATEGORY_USER_KEY;
  const orgCategory = INVITATION_MODULE_CATEGORY_ORG_KEY;
  const constraints = { moreData: 'foo' };

  let app: INestApplication;
  let invitationFactory: InvitationFactory;
  let seedingSource: SeedingSource;
  let user: UserEntityFixture;
  let otpService: OtpService;
  let configService: ConfigService;
  let config: ConfigType<typeof invitationDefaultConfig>;

  const expectInvitationMatch = (
    createDto: InvitationCreateInviteDto,
    response: InvitationDto,
  ) => {
    expect(response.category).toEqual(createDto.category);
    // TODO: this needs another call to find user
    // expect(response.user.email).toEqual(createDto.email);
  };

  beforeEach(async () => {
    jest
      .spyOn(EmailService.prototype, 'sendMail')
      .mockImplementation(async () => undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppCrudModuleFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    otpService = moduleFixture.get<OtpService>(OtpService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    config = configService.get<InvitationSettingsInterface>(
      INVITATION_MODULE_DEFAULT_SETTINGS_TOKEN,
    ) as InvitationSettingsInterface;

    seedingSource = new SeedingSource({
      dataSource: moduleFixture.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    const userFactory = new UserFactory({
      entity: UserEntityFixture,
      seedingSource,
    });

    invitationFactory = new InvitationFactory({
      entity: InvitationEntityFixture,
      seedingSource,
    });

    user = await userFactory.create();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  describe('Type: org', () => {
    let invitation: InvitationEntityInterface;

    beforeEach(async () => {
      invitation = await invitationFactory.create({
        category: orgCategory,
        userId: user.id,
      });
    });

    it('POST invitation', async () => {
      await createInvite(app, {
        email: user.email,
        category: orgCategory,
        constraints,
      });
    });

    it('PATCH invitation-acceptance', async () => {
      const { code } = invitation;

      const otp = await createOtp(config, otpService, user, orgCategory);

      const { passcode } = otp;

      await supertest(app.getHttpServer())
        .patch(`/invitation-acceptance/${code}`)
        .send({
          passcode,
          payload: { newPassword: 'hOdv2A2h%' },
        } as InvitationAcceptInviteDto)
        .expect(200);
    });
  });

  describe('Type: user', () => {
    let invitation: InvitationEntityInterface;

    beforeEach(async () => {
      invitation = await invitationFactory.create({
        category: userCategory,
        userId: user.id,
      });
    });

    it('POST invitation', async () => {
      await createInvite(app, {
        email: user.email,
        category: userCategory,
        constraints,
      });
    });

    it('POST invitation (create new user)', async () => {
      await createInvite(app, {
        email: 'test@mail.com',
        category: userCategory,
        constraints,
      });
    });

    it('POST invitation reattempt', async () => {
      const invitationDto = await createInvite(app, {
        email: 'test@mail.com',
        category: userCategory,
        constraints,
      });

      await supertest(app.getHttpServer())
        .post(`/invitation-reattempt/${invitationDto.code}`)
        .expect(201);
    });

    it('PATCH invitation-acceptance', async () => {
      const { code } = invitation;

      const otp = await createOtp(config, otpService, user, userCategory);

      const { passcode } = otp;

      await supertest(app.getHttpServer())
        .patch(`/invitation-acceptance/${code}`)
        .send({
          passcode,
          payload: { newPassword: 'hOdv2A2h%' },
        } as InvitationAcceptInviteDto)
        .expect(200);
    });

    it('GET invitation-acceptance', async () => {
      const { code } = invitation;

      const otp = await createOtp(config, otpService, user, userCategory);

      const { passcode } = otp;

      await supertest(app.getHttpServer())
        .get(`/invitation-acceptance/${code}?passcode=${passcode}`)
        .expect(200);
    });

    it('GET invitation', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/invitation')
        .expect(200);

      const invitationResponse = response.body.data as InvitationDto[];

      expect(invitationResponse.length).toEqual(1);
    });

    it('GET invitation/:id', async () => {
      const createInviteDto = plainToInstance(InvitationCreateInviteDto, {
        email: user.email,
        category: userCategory,
        constraints,
      });

      const invitation = await createInvite(app, createInviteDto);

      const response = await supertest(app.getHttpServer())
        .get(`/invitation/${invitation.id}`)
        .expect(200);

      const invitationResponse = response.body as InvitationDto;
      expectInvitationMatch(createInviteDto, invitationResponse);
    });

    it('DELETE invitation/:id', async () => {
      const invitation = await createInvite(app, {
        email: user.email,
        category: userCategory,
        constraints,
      });

      await supertest(app.getHttpServer())
        .delete(`/invitation/${invitation.id}`)
        .expect(200);

      await supertest(app.getHttpServer())
        .get(`/invitation/${invitation.id}`)
        .expect(404);
    });
  });
});

const createInvite = async (
  app: INestApplication,
  invitationCreateDto: InvitationCreateInviteDto,
): Promise<InvitationDto> => {
  const response = await supertest(app.getHttpServer())
    .post('/invitation')
    .send(invitationCreateDto)
    .expect(201);

  return response.body as InvitationDto;
};

const createOtp = async (
  config: ConfigType<typeof invitationDefaultConfig>,
  otpService: OtpService,
  user: UserInterface,
  category: string,
  clearOnCreate?: boolean,
): Promise<OtpInterface> => {
  const { assignment, type, expiresIn } = config.otp;

  return await otpService.create({
    assignment,
    otp: {
      category,
      type,
      expiresIn,
      assigneeId: user.id,
    },
    clearOnCreate,
  });
};
