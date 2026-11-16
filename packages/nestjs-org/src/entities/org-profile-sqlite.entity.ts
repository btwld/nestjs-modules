import { Column } from 'typeorm';

import {
  OrgInterface,
  OrgProfileEntityInterface,
} from '@concepta/nestjs-common';

import { CommonSqliteEntity } from './common-sqlite.entity';

/**
 * Org Profile Sqlite Entity
 */
export abstract class OrgProfileSqliteEntity
  extends CommonSqliteEntity
  implements OrgProfileEntityInterface
{
  @Column('uuid')
  orgId!: string;

  /**
   * Owner
   */
  org?: OrgInterface;
}
