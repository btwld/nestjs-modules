import { Column } from 'typeorm';

import { ReferenceId } from '@concepta/nestjs-core';
import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { UserCredentialEntityInterface } from '../../../domain/interfaces/user-credential-entity.interface.js';

export abstract class UserCredentialSqliteEntity
  extends CommonSqliteEntity
  implements UserCredentialEntityInterface
{
  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'uuid' })
  userId!: ReferenceId;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'datetime' })
  validFrom!: Date;

  @Column({ type: 'datetime', nullable: true })
  validTo!: Date | null;
}
