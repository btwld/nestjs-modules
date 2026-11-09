import { type OrgMemberInterface } from '@concepta/nestjs-common';

export interface OrgMemberUpdatableInterface extends Pick<
  OrgMemberInterface,
  'id' | 'orgId' | 'userId'
> {}
