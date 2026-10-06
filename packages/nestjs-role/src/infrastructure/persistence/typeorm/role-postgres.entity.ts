import { Column } from 'typeorm';

import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm';

import { RoleEntityInterface } from '../../../domain/interfaces/role-entity.interface.js';

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
