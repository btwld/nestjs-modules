import { IsUUID } from 'class-validator';

import { OrgMemberUpdatableInterface } from '../../interfaces/org-member-updatable.interface';

/**
 * Org Member Update DTO Fixture
 * Used for testing purposes
 */
export class OrgMemberUpdateDtoFixture implements OrgMemberUpdatableInterface {
  @IsUUID()
  id!: string;

  @IsUUID()
  userId!: string;

  @IsUUID()
  orgId!: string;
}
