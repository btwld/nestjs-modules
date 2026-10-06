import { Test, type TestingModule } from '@nestjs/testing';

import {
  type RepositoryInterface,
  getDynamicRepositoryToken,
} from '@concepta/nestjs-common';
import { CrudModule } from '@concepta/nestjs-crud';
import {
  TypeOrmExtModule,
  TypeOrmRepositoryAdapter,
} from '@concepta/nestjs-typeorm-ext';

import { ORG_MODULE_ORG_ENTITY_KEY } from './org.constants';
import { OrgModule } from './org.module';
import { OrgModelService } from './services/org-model.service';

import { InvitationEntityFixture } from './__fixtures__/invitation.entity.fixture';
import { OrgEntityFixture } from './__fixtures__/org-entity.fixture';
import { OrgMemberEntityFixture } from './__fixtures__/org-member.entity.fixture';
import { OrgProfileEntityFixture } from './__fixtures__/org-profile.entity.fixture';
import { OwnerEntityFixture } from './__fixtures__/owner-entity.fixture';
import { OwnerModuleFixture } from './__fixtures__/owner.module.fixture';
import { UserEntityFixture } from './__fixtures__/user-entity.fixture';

describe('OrgModule', () => {
  let orgModule: OrgModule;
  let orgModelService: OrgModelService;
  let orgDynamicRepo: RepositoryInterface<OrgEntityFixture>;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmExtModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            OrgEntityFixture,
            OwnerEntityFixture,
            OrgMemberEntityFixture,
            OrgProfileEntityFixture,
            UserEntityFixture,
            InvitationEntityFixture,
          ],
        }),
        OrgModule.forRootAsync({
          imports: [
            TypeOrmExtModule.forFeature({
              org: { entity: OrgEntityFixture },
              'org-member': { entity: OrgMemberEntityFixture },
            }),
          ],
          useFactory: () => ({}),
        }),
        CrudModule.forRoot({}),
        OwnerModuleFixture.register(),
      ],
    }).compile();

    orgModule = testModule.get<OrgModule>(OrgModule);
    orgDynamicRepo = testModule.get(
      getDynamicRepositoryToken(ORG_MODULE_ORG_ENTITY_KEY),
    );
    orgModelService = testModule.get<OrgModelService>(OrgModelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('module', () => {
    it('should be loaded', async () => {
      expect(orgModule).toBeInstanceOf(OrgModule);
      expect(orgDynamicRepo).toBeInstanceOf(TypeOrmRepositoryAdapter);
      expect(orgModelService).toBeInstanceOf(OrgModelService);
      expect(orgModelService['repo']).toBeInstanceOf(TypeOrmRepositoryAdapter);
      expect(orgModelService['repo'].find).toBeInstanceOf(Function);
    });
  });
});
