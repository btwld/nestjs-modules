import { Column, Unique } from 'typeorm';
import { ReferenceId, ReferenceIdInterface } from '@concepta/nestjs-common';
import { CommonPostgresEntity } from '@concepta/typeorm-common';

import { OrgMemberEntityInterface } from '../interfaces/org-member-entity.interface';

@Unique(['userId', 'orgId'])
export abstract class OrgMemberPostgresEntity
  extends CommonPostgresEntity
  implements OrgMemberEntityInterface
{
  @Column('boolean', { default: true })
  active = true;

  @Column()
  userId!: ReferenceId;

  @Column()
  orgId!: ReferenceId;

  user!: ReferenceIdInterface;

  org!: ReferenceIdInterface;
}
