import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  RepositoryInterface,
  UserEntityInterface,
  INVITATION_MODULE_CATEGORY_USER_KEY,
  getDynamicRepositoryToken,
  InvitationEntityInterface,
} from '@concepta/nestjs-common';
import { OtpService } from '@concepta/nestjs-otp';
import { UserFactory } from '@concepta/nestjs-user/src/seeding';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { INVITATION_MODULE_INVITATION_ENTITY_KEY } from '../invitation.constants';
import { InvitationFactory } from '../seeding/invitation.factory';

import { InvitationRevocationService } from './invitation-revocation.service';

import { AppModuleFixture } from '../__fixtures__/app.module.fixture';
import { InvitationEntityFixture } from '../__fixtures__/invitation/entities/invitation.entity.fixture';
import { UserEntityFixture } from '../__fixtures__/user/entities/user.entity.fixture';

describe(InvitationRevocationService, () => {
  const category = INVITATION_MODULE_CATEGORY_USER_KEY;

  let app: INestApplication;
  let seedingSource: SeedingSource;
  let otpService: OtpService;
  let invitationRepo: RepositoryInterface<InvitationEntityInterface>;
  let invitationRevocationService: InvitationRevocationService;

  let testUser: UserEntityInterface;
  let invitationFactory: InvitationFactory;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();
    app = testingModule.createNestApplication();
    await app.init();

    invitationRepo = testingModule.get<
      RepositoryInterface<InvitationEntityInterface>
    >(getDynamicRepositoryToken(INVITATION_MODULE_INVITATION_ENTITY_KEY));

    invitationRevocationService =
      testingModule.get<InvitationRevocationService>(
        InvitationRevocationService,
      );

    otpService = testingModule.get<OtpService>(OtpService);

    seedingSource = new SeedingSource({
      dataSource: testingModule.get(getDataSourceToken()),
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

    testUser = await userFactory.create();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  describe(InvitationRevocationService.prototype.revokeAll, () => {
    it('Should revoke all user invites', async () => {
      const spyOtpClear = jest.spyOn(otpService, 'clear');

      await invitationFactory.create({
        userId: testUser.id,
        category,
      });

      const invitations = await invitationRepo.find({
        where: {
          userId: testUser.id,
        },
      });

      expect(invitations.length).toEqual(1);
      expect(invitations[0].userId).toEqual(testUser.id);

      await invitationRevocationService.revokeAll({
        email: testUser.email,
        category,
      });

      // TODO: TYPEORM - review if we need count
      const allInvitations = await invitationRepo.find();

      expect(allInvitations.length).toEqual(0);
      expect(spyOtpClear).toHaveBeenCalledTimes(1);
    });
  });
});
