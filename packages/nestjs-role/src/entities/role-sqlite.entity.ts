import { Column } from 'typeorm';
import { CommonSqliteEntity } from '@concepta/typeorm-common';
import { RoleEntityInterface } from '../interfaces/role-entity.interface';

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
