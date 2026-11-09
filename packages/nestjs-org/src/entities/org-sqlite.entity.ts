import { Column } from 'typeorm';

import {
  OrgProfileInterface,
  ReferenceId,
  ReferenceIdInterface,
  OrgEntityInterface,
} from '@concepta/nestjs-common';

import { CommonSqliteEntity } from './common-sqlite.entity';

/**
 * Org Sqlite Entity
 */
export abstract class OrgSqliteEntity
  extends CommonSqliteEntity
  implements OrgEntityInterface
{
  @Column()
  name!: string;

  @Column('boolean', { default: true })
  active = true;

  /**
   * Owner Id
   */
  @Column('uuid')
  ownerId!: ReferenceId;

  /**
   * Owner
   */
  owner!: ReferenceIdInterface;

  /**
   * Profile
   */
  orgProfile?: OrgProfileInterface;
}
