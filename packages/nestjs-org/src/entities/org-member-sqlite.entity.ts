import { Column, Unique } from 'typeorm';

import { ReferenceId, OrgMemberEntityInterface } from '@concepta/nestjs-common';

import { CommonSqliteEntity } from './common-sqlite.entity';

@Unique(['userId', 'orgId'])
export abstract class OrgMemberSqliteEntity
  extends CommonSqliteEntity
  implements OrgMemberEntityInterface
{
  @Column('boolean', { default: true })
  active = true;

  @Column({ type: 'uuid' })
  userId!: ReferenceId;

  @Column({ type: 'uuid' })
  orgId!: ReferenceId;
}
