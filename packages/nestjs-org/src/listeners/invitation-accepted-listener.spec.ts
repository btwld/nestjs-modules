import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  INVITATION_MODULE_CATEGORY_ORG_KEY,
  InvitationEntityInterface,
  UserEntityInterface,
  OrgEntityInterface,
} from '@concepta/nestjs-common';
import { CrudModule } from '@concepta/nestjs-crud';
import { EventModule } from '@concepta/nestjs-event';
import { InvitationFactory } from '@concepta/nestjs-invitation/dist/seeding';
import { PasswordModule } from '@concepta/nestjs-password';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { UserModule } from '@concepta/nestjs-user';
import { UserFactory } from '@concepta/nestjs-user/dist/seeding';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { OrgModule } from '../org.module';
import { OrgFactory } from '../seeding/org.factory';
import { OrgMemberModelService } from '../services/org-member-model.service';

import { InvitationAcceptedListener } from './invitation-accepted-listener';

import { InvitationAcceptedEventAsync } from '../__fixtures__/invitation-accepted.event';
import { InvitationEntityFixture } from '../__fixtures__/invitation.entity.fixture';
import { OrgEntityFixture } from '../__fixtures__/org-entity.fixture';
import { OrgMemberModelServiceFixture } from '../__fixtures__/org-member-model.service.fixture';
import { OrgMemberEntityFixture } from '../__fixtures__/org-member.entity.fixture';
import { OrgProfileEntityFixture } from '../__fixtures__/org-profile.entity.fixture';
import { OwnerEntityFixture } from '../__fixtures__/owner-entity.fixture';
import { OwnerFactoryFixture } from '../__fixtures__/owner-factory.fixture';
import { OwnerModuleFixture } from '../__fixtures__/owner.module.fixture';
import { UserEntityFixture } from '../__fixtures__/user-entity.fixture';

describe(InvitationAcceptedListener, () => {
  const category = INVITATION_MODULE_CATEGORY_ORG_KEY;
  let app: INestApplication;
  let seedingSource: SeedingSource;
  let testUser: UserEntityInterface;
  let testOwner: OwnerEntityFixture;
  let testOrg: OrgEntityInterface;
  let testInvitation: InvitationEntityInterface;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [
        EventModule.forRoot({}),
        TypeOrmExtModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          entities: [
            OrgEntityFixture,
            OwnerEntityFixture,
            OrgMemberEntityFixture,
            OrgProfileEntityFixture,
            UserEntityFixture,
            InvitationEntityFixture,
          ],
        }),
        PasswordModule.forRoot({}),
        UserModule.forRootAsync({
          imports: [
            TypeOrmExtModule.forFeature({
              user: {
                entity: UserEntityFixture,
              },
            }),
          ],
          useFactory: () => ({}),
        }),
        OrgModule.forRootAsync({
          imports: [
            TypeOrmExtModule.forFeature({
              org: { entity: OrgEntityFixture },
              'org-member': { entity: OrgMemberEntityFixture },
            }),
          ],
          useFactory: () => ({
            settings: {
              invitationRequestEvent: InvitationAcceptedEventAsync,
            },
          }),
        }),
        CrudModule.forRoot({}),
        OwnerModuleFixture.register(),
      ],
    })
      .overrideProvider(OrgMemberModelService)
      .useClass(OrgMemberModelServiceFixture)
      .compile();
    app = testingModule.createNestApplication();
    await app.init();

    seedingSource = new SeedingSource({
      dataSource: testingModule.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    const ownerFactory = new OwnerFactoryFixture({
      entity: OwnerEntityFixture,
      seedingSource,
    });

    const orgFactory = new OrgFactory({
      entity: OrgEntityFixture,
      seedingSource,
      factories: [ownerFactory],
    });

    const userFactory = new UserFactory({
      entity: UserEntityFixture,
      seedingSource,
    });

    const invitationFactory = new InvitationFactory({
      entity: InvitationEntityFixture,
      seedingSource,
    });

    testUser = await userFactory.create();
    testOwner = await ownerFactory.create();
    testOrg = await orgFactory.create({
      ownerId: testOwner.id,
    });
    testInvitation = await invitationFactory.create({
      userId: testUser.id,
      category,
      constraints: { orgId: testOrg.id },
    });
  });

  it('event should be listened', async () => {
    const invitationAcceptedEventAsync = new InvitationAcceptedEventAsync({
      invitation: testInvitation,
      data: {
        userId: testInvitation.userId,
      },
    });

    const eventResult = await invitationAcceptedEventAsync.emit();

    const result = eventResult.every((it) => it === true);

    expect(result).toBe(true);
  });
});
