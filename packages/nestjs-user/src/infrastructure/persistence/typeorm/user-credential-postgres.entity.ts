import { Column } from 'typeorm';

import { ReferenceId } from '@concepta/nestjs-core';
import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm';

import { UserCredentialEntityInterface } from '../../../domain/interfaces/user-credential-entity.interface.js';

export abstract class UserCredentialPostgresEntity
  extends CommonPostgresEntity
  implements UserCredentialEntityInterface
{
  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'uuid' })
  userId!: ReferenceId;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'timestamptz' })
  validFrom!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  validTo!: Date | null;
}
