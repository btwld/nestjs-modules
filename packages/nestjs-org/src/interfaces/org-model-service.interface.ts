import {
  type CreateOneInterface,
  type RemoveOneInterface,
  type ReplaceOneInterface,
  type UpdateOneInterface,
  type OrgCreatableInterface,
  type OrgUpdatableInterface,
  type ByIdInterface,
  type ReferenceId,
  type OrgReplaceableInterface,
  type OrgEntityInterface,
} from '@concepta/nestjs-common';

export interface OrgModelServiceInterface
  extends
    ByIdInterface<ReferenceId, OrgEntityInterface>,
    CreateOneInterface<OrgCreatableInterface, OrgEntityInterface>,
    UpdateOneInterface<OrgUpdatableInterface, OrgEntityInterface>,
    ReplaceOneInterface<OrgReplaceableInterface, OrgEntityInterface>,
    RemoveOneInterface<Pick<OrgEntityInterface, 'id'>, OrgEntityInterface> {}
