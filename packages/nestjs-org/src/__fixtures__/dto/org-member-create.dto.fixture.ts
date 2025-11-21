import { IsUUID } from 'class-validator';

import { OrgMemberCreatableInterface } from '../../interfaces/org-member-creatable.interface';

/**
 * Org Member Create DTO Fixture
 * Used for testing purposes
 */
export class OrgMemberCreateDtoFixture implements OrgMemberCreatableInterface {
  @IsUUID()
  userId!: string;

  @IsUUID()
  orgId!: string;
}
