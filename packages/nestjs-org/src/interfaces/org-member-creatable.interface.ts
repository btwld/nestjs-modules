import { type OrgMemberInterface } from '@concepta/nestjs-common';

export interface OrgMemberCreatableInterface extends Pick<
  OrgMemberInterface,
  'orgId' | 'userId'
> {}
