import { Column } from 'typeorm';

import { CommonPostgresEntity } from '@concepta/nestjs-repository-typeorm';

import { IdentityEntityInterface } from '../interfaces/identity-entity.interface.js';

export abstract class IdentityPostgresEntity
  extends CommonPostgresEntity
  implements IdentityEntityInterface
{
  @Column()
  provider!: string;

  @Column()
  subject!: string;

  @Column({ type: 'uuid' })
  userId!: string;
}
