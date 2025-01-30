import { Column } from 'typeorm';
import { CommonSqliteEntity } from '@concepta/typeorm-common';
import { UserEntityInterface } from '../interfaces/user-entity.interface';
import { UserPasswordHistoryEntityInterface } from '../interfaces/user-password-history-entity.interface';
import { RoleOwnableInterface } from '@concepta/nestjs-common';

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

  /**
   * Password hash
   */
  @Column({ type: 'text', nullable: true, default: null })
  passwordHash: string | null = null;

  /**
   * Password salt
   */
  @Column({ type: 'text', nullable: true, default: null })
  passwordSalt: string | null = null;

  userRoles?: Partial<RoleOwnableInterface>[];

  userPasswordHistory?: UserPasswordHistoryEntityInterface;
}
