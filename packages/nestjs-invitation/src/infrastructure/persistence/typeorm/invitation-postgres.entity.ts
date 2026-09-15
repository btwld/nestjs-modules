import { Column } from 'typeorm';

import { PlainLiteralObject } from '@nestjs/common';

import { ReferenceActive, ReferenceId } from '@concepta/nestjs-core';
import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm';

import { InvitationEntityInterface } from '../interfaces/invitation-entity.interface.js';

export abstract class InvitationPostgresEntity
  extends CommonPostgresEntity
  implements InvitationEntityInterface
{
  @Column('boolean', { default: true })
  active!: ReferenceActive;

  @Column()
  code!: string;

  @Column()
  category!: string;

  @Column({ type: 'jsonb', nullable: true })
  constraints!: PlainLiteralObject;

  @Column({ type: 'uuid' })
  userId!: ReferenceId;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  dateAccepted!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  dateRevoked!: Date | null;
}
