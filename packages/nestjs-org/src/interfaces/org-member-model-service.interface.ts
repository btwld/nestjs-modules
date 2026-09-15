import {
  type ByIdInterface,
  type CreateOneInterface,
  type ReferenceId,
  type RemoveOneInterface,
  type OrgMemberEntityInterface,
} from '@concepta/nestjs-common';

import { type OrgMemberCreatableInterface } from './org-member-creatable.interface';

export interface OrgMemberModelServiceInterface
  extends
    ByIdInterface<ReferenceId, OrgMemberEntityInterface>,
    CreateOneInterface<OrgMemberCreatableInterface, OrgMemberEntityInterface>,
    RemoveOneInterface<
      Pick<OrgMemberEntityInterface, 'id'>,
      OrgMemberEntityInterface
    > {}
