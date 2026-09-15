import { Column } from 'typeorm';

import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { RoleEntityInterface } from '../../../domain/interfaces/role-entity.interface.js';

/**
 * Role Sqlite Entity
 */
export abstract class RoleSqliteEntity
  extends CommonSqliteEntity
  implements RoleEntityInterface
{
  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;
}
