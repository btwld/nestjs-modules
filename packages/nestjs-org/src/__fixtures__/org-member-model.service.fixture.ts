import { Injectable } from '@nestjs/common';

import {
  RepositoryInterface,
  InjectDynamicRepository,
  OrgMemberEntityInterface,
} from '@concepta/nestjs-common';

import { ORG_MODULE_ORG_MEMBER_ENTITY_KEY } from '../org.constants';
import { OrgMemberModelService } from '../services/org-member-model.service';

import { OrgMemberCreateDtoFixture } from './dto/org-member-create.dto.fixture';
import { OrgMemberUpdateDtoFixture } from './dto/org-member-update.dto.fixture';

/**
 * Org Member Model Service Fixture
 * Provides concrete DTOs for testing
 */
@Injectable()
export class OrgMemberModelServiceFixture extends OrgMemberModelService {
  protected createDto = OrgMemberCreateDtoFixture;
  protected updateDto = OrgMemberUpdateDtoFixture;

  constructor(
    @InjectDynamicRepository(ORG_MODULE_ORG_MEMBER_ENTITY_KEY)
    repo: RepositoryInterface<OrgMemberEntityInterface>,
  ) {
    super(repo);
  }
}
