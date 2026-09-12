import { Column } from 'typeorm';

import {
  OrgProfileInterface,
  ReferenceId,
  ReferenceIdInterface,
  OrgEntityInterface,
} from '@concepta/nestjs-common';

import { CommonPostgresEntity } from './common-postgres.entity';

/**
 * Org Postgres Entity
 */
export abstract class OrgPostgresEntity
  extends CommonPostgresEntity
  implements OrgEntityInterface
{
  /**
   * Name
   */
  @Column()
  name!: string;

  /**
   * Flag to determine if the org is active or not
   */
  @Column('boolean', { default: true })
  active = true;

  /**
   * Owner Id
   */
  @Column('uuid', { nullable: false })
  ownerId!: ReferenceId;

  /**
   * Owner
   */
  owner?: ReferenceIdInterface;

  /**
   * Profile
   */
  orgProfile?: OrgProfileInterface;
}
