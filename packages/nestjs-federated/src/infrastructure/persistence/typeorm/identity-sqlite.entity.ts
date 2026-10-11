import { Column } from 'typeorm';

import { CommonSqliteEntity } from '@concepta/nestjs-repository-typeorm';

import { IdentityEntityInterface } from '../interfaces/identity-entity.interface.js';

export abstract class IdentitySqliteEntity
  extends CommonSqliteEntity
  implements IdentityEntityInterface
{
  @Column()
  provider!: string;

  @Column()
  subject!: string;

  @Column()
  userId!: string;
}
