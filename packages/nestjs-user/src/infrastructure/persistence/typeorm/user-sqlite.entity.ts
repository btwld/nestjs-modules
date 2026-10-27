import { Column } from 'typeorm';

import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { UserEntityInterface } from '../../../domain/interfaces/user-entity.interface.js';

/**
 * User Entity
 */
export abstract class UserSqliteEntity
  extends CommonSqliteEntity
  implements UserEntityInterface
{
  /**
   * Email
   */
  @Column({ unique: true })
  email!: string;

  /**
   * Username
   */
  @Column({ unique: true })
  username!: string;

  /**
   * Active
   */
  @Column({ default: true })
  active!: boolean;
}
