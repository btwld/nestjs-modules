import {
  type OrgEntityInterface,
  type RepositoryEntityOptionInterface,
  type OrgMemberEntityInterface,
  type OrgProfileEntityInterface,
} from '@concepta/nestjs-common';

import {
  type ORG_MODULE_ORG_MEMBER_ENTITY_KEY,
  type ORG_MODULE_ORG_ENTITY_KEY,
  type ORG_MODULE_ORG_PROFILE_ENTITY_KEY,
} from '../org.constants';

export interface OrgEntitiesOptionsInterface {
  [ORG_MODULE_ORG_ENTITY_KEY]: RepositoryEntityOptionInterface<OrgEntityInterface>;
  [ORG_MODULE_ORG_MEMBER_ENTITY_KEY]: RepositoryEntityOptionInterface<OrgMemberEntityInterface>;
  [ORG_MODULE_ORG_PROFILE_ENTITY_KEY]?: RepositoryEntityOptionInterface<OrgProfileEntityInterface>;
}
