import { Column, Unique } from 'typeorm';

import { ReferenceId, OrgMemberEntityInterface } from '@concepta/nestjs-common';

import { CommonPostgresEntity } from './common-postgres.entity';

@Unique(['userId', 'orgId'])
export abstract class OrgMemberPostgresEntity
  extends CommonPostgresEntity
  implements OrgMemberEntityInterface
{
  @Column('boolean', { default: true })
  active = true;

  @Column({ type: 'uuid' })
  userId!: ReferenceId;

  @Column({ type: 'uuid' })
  orgId!: ReferenceId;
}
