import { Injectable } from '@nestjs/common';

import {
  Type,
  RepositoryInterface,
  ModelService,
  InjectDynamicRepository,
  OrgMemberEntityInterface,
} from '@concepta/nestjs-common';

import { OrgMemberCreatableInterface } from '../interfaces/org-member-creatable.interface';
import { OrgMemberModelServiceInterface } from '../interfaces/org-member-model-service.interface';
import { OrgMemberUpdatableInterface } from '../interfaces/org-member-updatable.interface';
import { ORG_MODULE_ORG_MEMBER_ENTITY_KEY } from '../org.constants';

/**
 * Org member model service
 */
@Injectable()
export class OrgMemberModelService
  extends ModelService<
    OrgMemberEntityInterface,
    OrgMemberCreatableInterface,
    OrgMemberUpdatableInterface
  >
  implements OrgMemberModelServiceInterface
{
  constructor(
    @InjectDynamicRepository(ORG_MODULE_ORG_MEMBER_ENTITY_KEY)
    repo: RepositoryInterface<OrgMemberEntityInterface>,
  ) {
    super(repo);
  }

  protected createDto!: Type<OrgMemberCreatableInterface>;
  protected updateDto!: Type<OrgMemberUpdatableInterface>;
}
