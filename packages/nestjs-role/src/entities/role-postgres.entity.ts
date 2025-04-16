import { Column } from 'typeorm';
import { CommonPostgresEntity } from '@concepta/typeorm-common';
import { RoleEntityInterface } from '../interfaces/role-entity.interface';

/**
 * Role Postgres Entity
 */
export abstract class RolePostgresEntity
  extends CommonPostgresEntity
  implements RoleEntityInterface
{
  /**
   * Name
   */
  @Column()
  name!: string;

  /**
   * Description
   */
  @Column()
  description!: string;
}
