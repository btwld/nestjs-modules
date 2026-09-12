import { Column } from 'typeorm';

import { ReferenceIdInterface } from '@concepta/nestjs-core';
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

  abstract user: ReferenceIdInterface;
}
