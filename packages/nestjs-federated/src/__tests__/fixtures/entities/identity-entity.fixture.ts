import { Entity, JoinColumn, ManyToOne } from 'typeorm';

import { ReferenceIdInterface } from '@concepta/nestjs-core';

import { IdentitySqliteEntity } from '../../../infrastructure/persistence/typeorm/identity-sqlite.entity.js';

@Entity()
export class IdentityEntityFixture extends IdentitySqliteEntity {
  @ManyToOne('UserEntityFixture')
  @JoinColumn({ name: 'userId' })
  user?: ReferenceIdInterface;
}
