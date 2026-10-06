import { Column } from 'typeorm';

import {
  OrgInterface,
  OrgProfileEntityInterface,
} from '@concepta/nestjs-common';

import { CommonPostgresEntity } from './common-postgres.entity';

/**
 * Org Profile Postgres Entity
 */
export abstract class OrgProfilePostgresEntity
  extends CommonPostgresEntity
  implements OrgProfileEntityInterface
{
  /**
   * Flag to determine if the org is active or not
   */
  @Column('uuid')
  orgId!: string;

  /**
   * Owner
   */
  org?: OrgInterface;
}
