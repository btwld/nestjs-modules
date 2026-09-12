import { Column } from 'typeorm';

import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm';

import { UserEntityInterface } from '../../../domain/interfaces/user-entity.interface.js';

/**
 * User Entity
 */
export abstract class UserPostgresEntity
  extends CommonPostgresEntity
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
