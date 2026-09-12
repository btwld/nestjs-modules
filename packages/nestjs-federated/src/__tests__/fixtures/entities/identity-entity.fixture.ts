import { Entity, ManyToOne } from 'typeorm';

import { ReferenceIdInterface } from '@concepta/nestjs-core';

import { IdentitySqliteEntity } from '../../../infrastructure/persistence/typeorm/identity-sqlite.entity.js';

@Entity()
export class IdentityEntityFixture extends IdentitySqliteEntity {
  @ManyToOne('UserEntityFixture', { eager: true })
  user!: ReferenceIdInterface;
}
